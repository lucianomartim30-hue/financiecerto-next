/**
 * GET /api/orulo
 *
 * Serve o catálogo de empreendimentos Orulo.
 *
 * Estratégia em camadas:
 *  1. Vercel KV  → catálogo completo em cache (< 10ms)
 *  2. API ao vivo → fallback quando KV está vazio ou indisponível
 *
 * Parâmetros de query suportados:
 *  all=1             → retorna todos os imóveis sem paginação (usado pelo mapa)
 *  city=São Paulo    → filtro de cidade
 *  neighborhood=...  → filtro de bairro (substring)
 *  neighborhoods=A,B,C → filtro por lista de bairros (match exato normalizado, usado por /regiao)
 *  cities=A,B,C      → filtro por lista de municípios (match exato normalizado, usado por /regiao/abc-paulista)
 *  min_price=N       → preço mínimo
 *  max_price=N       → preço máximo
 *  bedrooms_min=N    → dormitórios mínimos
 *  bedrooms_max=N    → dormitórios máximos
 *  status=...        → status normalizado (na planta | em obras | pronto)
 *  page=N            → página (20 por página)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getToken, invalidateToken,
  normalizeBuilding, normalizeStatus, fetchSearchPage,
  type NormalizedBuilding,
} from '@/lib/orulo-api';
import { lookupSPCoords } from '@/lib/sp-neighborhoods';
import { filterBreveLancamento } from '@/lib/filtro-breve-lancamento';
import { filterLotesForaSP } from '@/lib/filtro-lotes-fora-sp';
import { kvGetCatalog, kvGetMeta } from '@/lib/orulo-kv';
import { CIDADES_LIBERADAS } from '@/lib/cidades-liberadas';

// O fallback ao vivo (cache KV vazio/frio) pode varrer o estado inteiro em lotes
// pequenos e pausados — mais lento que os 10s padrão da Vercel, mas evita
// rate-limit silencioso da Orulo. Normalmente nem entra em uso (KV já populado).
export const maxDuration = 60;

// ── Auto-trigger: dispara sync em background quando catálogo está incompleto ──
// Garante que o catálogo se reconstrói sozinho sem intervenção manual.
let _lastAutoSync = 0; // timestamp do último disparo (evita avalanche — por instância)
// Rate limit da Orulo: ~400 req/hora. Debounce de 60 min garante cota recuperada.
const AUTO_SYNC_DEBOUNCE_MS = 60 * 60 * 1000; // 60 minutos

async function maybeAutoSync(req: NextRequest): Promise<void> {
  const now = Date.now();
  // Debounce em memória (evita múltiplos disparos na mesma instância quente)
  if (now - _lastAutoSync < AUTO_SYNC_DEBOUNCE_MS) return;
  try {
    const meta = await kvGetMeta();
    if (meta?.is_complete) return; // catálogo ok, nada a fazer
    // Debounce via KV: respeita instâncias diferentes (serverless)
    if (meta?.last_chunk_at) {
      const lastSync = new Date(meta.last_chunk_at).getTime();
      if (now - lastSync < AUTO_SYNC_DEBOUNCE_MS) return;
    }
    _lastAutoSync = now;
    const syncSecret = process.env.ORULO_SYNC_SECRET ?? '';
    const syncUrl = new URL('/api/orulo/sync', req.url);
    if (syncSecret) syncUrl.searchParams.set('secret', syncSecret);
    fetch(syncUrl.toString(), { signal: AbortSignal.timeout(2000) }).catch(() => {});
    console.log('[auto-sync] catálogo incompleto — sync disparado em background (last:', meta?.last_chunk_at, ')');
  } catch { /* silencioso */ }
}

const ORULO_BASE = 'https://www.orulo.com.br';

// ── Mock data (USE_MOCK=true) ─────────────────────────────────────────────────
const MOCK_BUILDINGS = [
  { id: '1', name: 'Residencial Vila Madalena', developer: 'Construtora ABC', min_price: 320000, max_price: 450000, bedrooms_min: 2, bedrooms_max: 3, area_min: 62, area_max: 85, bathrooms_min: 2, bathrooms_max: 2, vagas_min: 1, vagas_max: 1, neighborhood: 'Vila Madalena', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Pronto' },
  { id: '2', name: 'Jardins Exclusive',         developer: 'MRV Engenharia',  min_price: 280000, max_price: 380000, bedrooms_min: 1, bedrooms_max: 2, area_min: 38, area_max: 58, bathrooms_min: 1, bathrooms_max: 2, vagas_min: 1, vagas_max: 1, neighborhood: 'Jardins',       city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Na Planta' },
  { id: '3', name: 'Moema Garden',              developer: 'Cyrela',          min_price: 650000, max_price: 900000, bedrooms_min: 2, bedrooms_max: 4, area_min: 80, area_max: 140, bathrooms_min: 2, bathrooms_max: 3, vagas_min: 2, vagas_max: 2, neighborhood: 'Moema',         city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Pronto' },
  { id: '4', name: 'Vila Mariana Park',         developer: 'Even',            min_price: 480000, max_price: 620000, bedrooms_min: 1, bedrooms_max: 3, area_min: 45, area_max: 90, bathrooms_min: 1, bathrooms_max: 2, vagas_min: 1, vagas_max: 1, neighborhood: 'Vila Mariana',  city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Em Obras' },
  { id: '5', name: 'Jabaquara Residences',      developer: 'Trisul',          min_price: 250000, max_price: 350000, bedrooms_min: 2, bedrooms_max: 2, area_min: 55, area_max: 70, bathrooms_min: 2, bathrooms_max: 2, vagas_min: 1, vagas_max: 1, neighborhood: 'Jabaquara',     city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Na Planta' },
];

// Filtro de Breve Lançamento — movido para lib/filtro-breve-lancamento.ts para
// poder ser reutilizado em app/sitemap.ts (route.ts só pode exportar handlers
// HTTP, não helpers soltos).

// ── Filtros sobre o catálogo ──────────────────────────────────────────────────

function applyFilters(
  buildings: NormalizedBuilding[],
  {
    neighborhood,
    neighborhoods,
    cities,
    propertyTypes,
    minPrice, maxPrice,
    bedroomsMin, bedroomsMax,
    status,
    q,
  }: {
    neighborhood?:  string | null;
    neighborhoods?: string[] | null;
    cities?:        string[] | null;
    propertyTypes?: string[] | null;
    minPrice?:      string | null;
    maxPrice?:      string | null;
    bedroomsMin?:   string | null;
    bedroomsMax?:   string | null;
    status?:        string | null;
    q?:             string | null;
  },
): NormalizedBuilding[] {
  let all = buildings;
  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  if (propertyTypes && propertyTypes.length > 0) {
    const set = new Set(propertyTypes.map(normalize));
    all = all.filter(b => (b.property_types || []).some(t => set.has(normalize(t))));
  }
  if (cities && cities.length > 0) {
    const set = new Set(cities.map(normalize));
    all = all.filter(b => set.has(normalize(b.city || '')));
  }
  if (neighborhoods && neighborhoods.length > 0) {
    const set = new Set(neighborhoods.map(normalize));
    all = all.filter(b => set.has(normalize(b.neighborhood || '')));
  } else if (neighborhood) {
    // Comparação sem acento: slugToLocation() decodifica o slug da URL sem
    // diacríticos ("taboao-pr" → "Taboao"), mas o catálogo guarda o nome real
    // ("Taboão"). Um match ingênuo por .toLowerCase() nunca bate nesses casos
    // e a página de bairro renderiza vazia (soft-404) — afeta qualquer bairro
    // com acento, não só os de fora de SP.
    const nb = normalize(neighborhood);
    all = all.filter(b => normalize(b.neighborhood || '').includes(nb));
  }
  if (q && !neighborhood) {
    const lq = q.toLowerCase();
    all = all.filter(b => [b.name, b.neighborhood, b.city, b.developer].join(' ').toLowerCase().includes(lq));
  }
  if (minPrice)    all = all.filter(b => (b.min_price ?? 0) >= Number(minPrice));
  if (maxPrice)    all = all.filter(b => (b.min_price ?? 0) <= Number(maxPrice));
  if (bedroomsMin) all = all.filter(b => (b.bedrooms_max ?? 99) >= Number(bedroomsMin));
  if (bedroomsMax && bedroomsMax !== '99')
                   all = all.filter(b => (b.bedrooms_min ?? 0) <= Number(bedroomsMax));
  if (status) {
    all = all.filter(b => b.status_norm === status);
  }

  return all;
}

// ── Fallback: busca ao vivo via API de pesquisa ───────────────────────────────
// Usado quando o KV não está disponível ou vazio.

// Orulo rejeita silenciosamente a maioria das requisições acima de ~20 paralelas
// (mesmo limite documentado em /api/orulo/sync). Passar disso faz fetchSearchPage
// retornar página vazia (catch interno), e o resultado final aparenta "0 imóveis"
// mesmo quando eles existem — por isso o batch é pequeno e tem pausa entre lotes.
const BATCH_SIZE     = 20;
const BATCH_DELAY_MS = 250;
const MAX_CITY_PAGES = 250;

async function fetchLiveCatalog(token: string, city: string): Promise<NormalizedBuilding[]> {
  const p1 = await fetchSearchPage(token, city, 1);
  const totalPages   = p1.rawPages > 0 ? p1.rawPages : MAX_CITY_PAGES;
  const pagesToFetch = Math.min(totalPages, MAX_CITY_PAGES);

  const remaining = Array.from({ length: pagesToFetch - 1 }, (_, i) => i + 2);
  const res1: Awaited<ReturnType<typeof fetchSearchPage>>[] = [];
  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    if (i > 0) await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    const chunk = remaining.slice(i, i + BATCH_SIZE);
    res1.push(...await Promise.all(chunk.map(p => fetchSearchPage(token, city, p))));
  }
  const all = [p1, ...res1].flatMap(r => r.buildings);

  // Deduplicar
  const seen = new Set<string>();
  return all.filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true; });
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page         = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const returnAll    = searchParams.get('all') === '1';
    const minPrice     = searchParams.get('min_price');
    const maxPrice     = searchParams.get('max_price');
    const state        = searchParams.get('state') || 'SP';
    const city         = searchParams.get('city')  || '';
    const neighborhood = searchParams.get('neighborhood') || '';
    const neighborhoodsParam = searchParams.get('neighborhoods') || '';
    const neighborhoods = neighborhoodsParam ? neighborhoodsParam.split(',').map(s => s.trim()).filter(Boolean) : null;
    const citiesParam  = searchParams.get('cities') || '';
    const cities = citiesParam ? citiesParam.split(',').map(s => s.trim()).filter(Boolean) : null;
    const typesParam  = searchParams.get('types') || '';
    const propertyTypes = typesParam ? typesParam.split(',').map(s => s.trim()).filter(Boolean) : null;
    const bedroomsMin  = searchParams.get('bedrooms_min');
    const bedroomsMax  = searchParams.get('bedrooms_max');
    const statusReq    = searchParams.get('status');
    const q            = searchParams.get('q');
    const residencial  = searchParams.get('residencial') === '1';

    // ── Mock ────────────────────────────────────────────────────────────────
    if (process.env.USE_MOCK === 'true') {
      let buildings = MOCK_BUILDINGS.map(b => ({ ...b, status_norm: normalizeStatus(b.status), lat: null as number | null, lng: null as number | null }));
      buildings = applyFilters(buildings as unknown as NormalizedBuilding[], { neighborhood, neighborhoods, cities, propertyTypes, minPrice, maxPrice, bedroomsMin, bedroomsMax, status: statusReq, q }) as unknown as typeof buildings;
      return NextResponse.json({ buildings, total: buildings.length, page: 1, pages: 1, source: 'mock' });
    }

    const token = await getToken();


    // ── Camada 1: Catálogo do KV ─────────────────────────────────────────────
    const cached = await kvGetCatalog();

    // Auto-sync em background se catálogo incompleto (fire-and-forget)
    maybeAutoSync(req);

    if (cached && cached.length > 0) {
      let all = cached;

      // Filtra por Grande SP por padrão (somente municípios da RMSP)
      all = all.filter(b => CIDADES_LIBERADAS.has((b.city || '').toLowerCase().trim()));

      // Filtra Breve Lançamento: só exibe se tiver delivery_date nos próximos 2 meses.
      // Empreendimentos já lançados (com min_price > 0) sempre aparecem.
      all = filterBreveLancamento(all);

      // Fora do estado de SP, remove loteamentos/terrenos — só empreendimentos
      // de verdade (ver lib/filtro-lotes-fora-sp.ts).
      all = filterLotesForaSP(all);

      // Opt-in: só residencial (ex: página do Minha Casa Minha Vida, que não
      // se aplica a imóvel comercial). Não filtra por padrão pra não mudar o
      // comportamento de quem já usa a rota sem esse parâmetro.
      if (residencial) all = all.filter(b => b.finality_norm !== 'comercial');

      // Filtra por cidade específica se informada
      if (city) {
        const lc = city.toLowerCase();
        all = all.filter(b => (b.city || '').toLowerCase().includes(lc));
      }

      all = applyFilters(all, { neighborhood, neighborhoods, cities, propertyTypes, minPrice, maxPrice, bedroomsMin, bedroomsMax, status: statusReq, q });

      const uniqueNeighborhoods = [...new Set(all.map(b => b.neighborhood).filter(Boolean))].sort();

      if (returnAll) {
        return NextResponse.json({
          buildings: all,
          total:     all.length,
          page:      1,
          pages:     1,
          source:    'kv_cache',
          neighborhoods: uniqueNeighborhoods,
        });
      }

      const PER_PAGE = 20;
      const start    = (page - 1) * PER_PAGE;
      return NextResponse.json({
        buildings:    all.slice(start, start + PER_PAGE),
        total:        all.length,
        page,
        pages:        Math.ceil(all.length / PER_PAGE) || 1,
        source:       'kv_cache',
        neighborhoods: uniqueNeighborhoods,
      });
    }

    // ── Camada 2: API ao vivo (fallback — KV vazio ou não configurado) ────────
    // Regiões por município (ex: ABC Paulista) cruzam várias cidades — busca o
    // estado inteiro (cityTarget vazio) em vez de restringir a uma única cidade.
    const cityTarget = city || (cities && cities.length > 0 ? '' : 'São Paulo');

    if (neighborhood || (neighborhoods && neighborhoods.length > 0) || (cities && cities.length > 0) || returnAll) {
      // Busca completa multi-página
      const liveBuildings = await fetchLiveCatalog(token, cityTarget);
      let all = applyFilters(liveBuildings, { neighborhood, neighborhoods, cities, propertyTypes, minPrice, maxPrice, bedroomsMin, bedroomsMax, status: statusReq, q });
      const uniqueNeighborhoods = [...new Set(all.map(b => b.neighborhood).filter(Boolean))].sort();

      if (returnAll) {
        return NextResponse.json({
          buildings: all,
          total:     all.length,
          page:      1,
          pages:     1,
          source:    'live_api',
          neighborhoods: uniqueNeighborhoods,
          _hint:     'Execute /api/orulo/sync para ativar o cache KV.',
        });
      }

      const PER_PAGE = 20;
      const start    = (page - 1) * PER_PAGE;
      return NextResponse.json({
        buildings:    all.slice(start, start + PER_PAGE),
        total:        all.length,
        page,
        pages:        Math.ceil(all.length / PER_PAGE) || 1,
        source:       'live_api',
        neighborhoods: uniqueNeighborhoods,
      });
    }

    // ── Busca direta na Orulo (sem localização específica) ────────────────────
    const qs = new URLSearchParams();
    qs.set('page',     String(page));
    qs.set('per_page', '50');
    qs.set('state',    state);
    if (minPrice)                            qs.set('min_price',    minPrice);
    if (maxPrice)                            qs.set('max_price',    maxPrice);
    if (city)                                qs.set('city',         city);
    if (bedroomsMin)                         qs.set('min_bedrooms', bedroomsMin);
    if (bedroomsMax && bedroomsMax !== '99') qs.set('max_bedrooms', bedroomsMax);
    if (q)                                   qs.set('q',            q);

    const resp = await fetch(`${ORULO_BASE}/api/v2/buildings?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`Orulo buildings error ${resp.status}`);

    const raw     = await resp.json();
    const rawList = (raw.buildings ?? raw.data ?? raw.results ?? []) as Record<string, unknown>[];
    let   buildings = rawList.map(normalizeBuilding);

    if (statusReq) {
      buildings = buildings.filter(b => b.status_norm === statusReq);
    }

    return NextResponse.json({
      buildings,
      total:  raw.total       ?? buildings.length,
      page,
      pages:  raw.total_pages ?? raw.pages ?? 1,
      source: 'orulo_search',
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[api/orulo]', message);
    if (message.includes('não configurados'))
      return NextResponse.json({ error: 'Integração Orulo não configurada.' }, { status: 500 });
    if (message.includes('401') || message.includes('403')) {
      invalidateToken();
      return NextResponse.json({ error: 'Credenciais Orulo inválidas.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro ao buscar imóveis.' }, { status: 500 });
  }
}
