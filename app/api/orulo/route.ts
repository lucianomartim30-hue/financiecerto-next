import { NextRequest, NextResponse } from 'next/server';
import { lookupSPCoords } from '@/lib/sp-neighborhoods';

const ORULO_BASE = 'https://www.orulo.com.br';

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_BUILDINGS = [
  { id: '1', name: 'Residencial Vila Madalena', developer: 'Construtora ABC', min_price: 320000, max_price: 450000, bedrooms_min: 2, bedrooms_max: 3, area_min: 62, area_max: 85, bathrooms_min: 2, bathrooms_max: 2, vagas_min: 1, vagas_max: 1, neighborhood: 'Vila Madalena', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Pronto' },
  { id: '2', name: 'Jardins Exclusive',         developer: 'MRV Engenharia',  min_price: 280000, max_price: 380000, bedrooms_min: 1, bedrooms_max: 2, area_min: 38, area_max: 58, bathrooms_min: 1, bathrooms_max: 2, vagas_min: 1, vagas_max: 1, neighborhood: 'Jardins',       city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Na Planta' },
  { id: '3', name: 'Moema Garden',              developer: 'Cyrela',          min_price: 650000, max_price: 900000, bedrooms_min: 2, bedrooms_max: 4, area_min: 80, area_max: 140, bathrooms_min: 2, bathrooms_max: 3, vagas_min: 2, vagas_max: 2, neighborhood: 'Moema',         city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Pronto' },
  { id: '4', name: 'Vila Mariana Park',         developer: 'Even',            min_price: 480000, max_price: 620000, bedrooms_min: 1, bedrooms_max: 3, area_min: 45, area_max: 90, bathrooms_min: 1, bathrooms_max: 2, vagas_min: 1, vagas_max: 1, neighborhood: 'Vila Mariana',  city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Em Obras' },
  { id: '5', name: 'Jabaquara Residences',      developer: 'Trisul',          min_price: 250000, max_price: 350000, bedrooms_min: 2, bedrooms_max: 2, area_min: 55, area_max: 70, bathrooms_min: 2, bathrooms_max: 2, vagas_min: 1, vagas_max: 1, neighborhood: 'Jabaquara',     city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Na Planta' },
];

// ── Token (warm cache por instância — ok para Vercel) ─────────────────────────
let _tokenCache = { token: null as string | null, expiresAt: 0 };

async function getToken(): Promise<string> {
  const now = Date.now();
  if (_tokenCache.token && now < _tokenCache.expiresAt) return _tokenCache.token;
  const clientId     = process.env.ORULO_CLIENT_ID;
  const clientSecret = process.env.ORULO_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('ORULO_CLIENT_ID ou ORULO_CLIENT_SECRET não configurados.');
  const resp = await fetch(`${ORULO_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }).toString(),
  });
  if (!resp.ok) throw new Error(`Orulo token error ${resp.status}`);
  const data = await resp.json();
  if (!data.access_token) throw new Error('Token nao retornado.');
  _tokenCache = { token: data.access_token, expiresAt: now + 20 * 60 * 60 * 1000 };
  return data.access_token;
}

// ── Normalização ──────────────────────────────────────────────────────────────

function normalizeStatus(raw: string): string {
  const s = (raw || '').toLowerCase().replace(/[áàãâ]/g,'a').replace(/[éèê]/g,'e').replace(/[íìî]/g,'i').replace(/[óòõô]/g,'o').replace(/[úùû]/g,'u').replace(/ç/g,'c').trim();
  // Na Planta (inclui Lançamento — mesmo conceito)
  if (s.includes('planta') || s.includes('lanca') || s.includes('lancamento') || s === 'pre-lancamento') return 'na planta';
  // Em Obras
  if (s.includes('obra') || s.includes('constru') || s.includes('andamento')) return 'em obras';
  // Pronto / Novo
  if (s.includes('pronto') || s.includes('entreg') || s.includes('conclui') || s === 'novo' || s === 'new') return 'pronto';
  return s;
}

function extractNeighborhood(address: Record<string, unknown>): string {
  return (
    (address.area         as string) ||
    (address.neighborhood as string) ||
    (address.neighbourhood as string) ||
    (address.district      as string) ||
    (address.region        as string) ||
    ''
  );
}

// Converte qualquer valor (string, number, null) em número de coordenada ou null
function parseCoord(v: unknown): number | null {
  if (v === null || v === undefined || v === '' || v === 0) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isFinite(n) && n !== 0 ? n : null;
}

function normalizeBuilding(b: Record<string, unknown>) {
  const developer = (b.developer as Record<string, string> | null)?.name || (b.developer_name as string) || '';
  const address   = (b.address   as Record<string, unknown>) || {};
  const img       = (b.default_image as Record<string, string>) || {};

  // Coordenadas: tenta campos da API, depois fallback por bairro
  let lat = parseCoord(b.latitude ?? b.lat ?? (b.coordinates as Record<string,unknown>)?.lat ?? (b.coordinate as Record<string,unknown>)?.lat ?? (b.location as Record<string,unknown>)?.lat ?? address.latitude ?? address.lat);
  let lng = parseCoord(b.longitude ?? b.lng ?? (b.coordinates as Record<string,unknown>)?.lng ?? (b.coordinate as Record<string,unknown>)?.lng ?? (b.location as Record<string,unknown>)?.lng ?? address.longitude ?? address.lng);
  if (!lat || !lng) {
    const fb = lookupSPCoords(extractNeighborhood(address), (address.city as string) || '');
    if (fb) { lat = fb.lat; lng = fb.lng; }
  }

  return {
    id:            String(b.id),
    name:          (b.name as string) || 'Empreendimento',
    developer,
    min_price:     (b.min_price     as number) ?? null,
    max_price:     (b.max_price     as number) ?? null,
    bedrooms_min:  (b.min_bedrooms  as number) ?? null,
    bedrooms_max:  (b.max_bedrooms  as number) ?? null,
    area_min:      (b.min_area      as number) ?? (b.area_min  as number) ?? null,
    area_max:      (b.max_area      as number) ?? (b.area_max  as number) ?? null,
    bathrooms_min: (b.min_bathrooms as number) ?? (b.bathrooms_min as number) ?? null,
    bathrooms_max: (b.max_bathrooms as number) ?? (b.bathrooms_max as number) ?? null,
    vagas_min:     (b.min_parking_spots as number) ?? (b.min_garages as number) ?? (b.parking_spots_min as number) ?? (b.min_parking as number) ?? (b.vagas_min as number) ?? (b.garagens_min as number) ?? null,
    vagas_max:     (b.max_parking_spots as number) ?? (b.max_garages as number) ?? (b.parking_spots_max as number) ?? (b.max_parking as number) ?? (b.vagas_max as number) ?? (b.garagens_max as number) ?? null,
    neighborhood:  extractNeighborhood(address),
    address_full:  [address.street as string, address.number as string].filter(Boolean).join(', ') || '',
    street:        (address.street  as string) || '',
    number:        (address.number  as string) || '',
    city:          (address.city    as string) || '',
    state:         (address.state   as string) || '',
    lat,
    lng,
    delivery_date: (b.delivery_date as string) ?? (b.expected_delivery as string) ?? (b.completion_date as string) ?? null,
    photo:         img['520x280'] || img['840x560'] || img['200x140'] || null,
    sharing_url:   (b.sharing_url as string) || null,
    orulo_url:     (b.sharing_url as string) || `${ORULO_BASE}/buildings/${b.id}`,
    status:        (b.stage as string) || (b.status as string) || '',
    status_norm:   normalizeStatus((b.stage as string) || (b.status as string) || ''),
    updated_at:    (b.updated_at as string) || null,
  };
}

type NormalizedBuilding = ReturnType<typeof normalizeBuilding>;

// ── Resultado de uma página ───────────────────────────────────────────────────
interface PageResult {
  buildings:   NormalizedBuilding[];
  rawCount:    number;   // qtd bruta devolvida pela API (antes de filtros)
  rawTotal:    number;   // total_count da API (se disponível)
  rawPages:    number;   // total_pages da API (se disponível)
  httpStatus:  number;
  rawSample:   Record<string, unknown> | null;
  error?:      string;
}

// ── Busca uma página da cidade ─────────────────────────────────────────────────
async function fetchCityPage(
  token: string,
  city: string,
  page: number,
): Promise<PageResult> {
  try {
    const qs = new URLSearchParams({ state: 'SP', city, per_page: '200', page: String(page) });
    const resp = await fetch(`${ORULO_BASE}/api/v2/buildings?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      // Timeout explícito para evitar que uma página trave as outras
      signal: AbortSignal.timeout(12000),
    });
    if (!resp.ok) return { buildings: [], rawCount: 0, rawTotal: 0, rawPages: 0, httpStatus: resp.status, rawSample: null, error: `HTTP ${resp.status}` };

    const raw = await resp.json();
    const list = (raw.buildings ?? raw.data ?? raw.results ?? []) as Record<string, unknown>[];

    // Tenta extrair totais da resposta da API
    const rawTotal = Number(raw.total_count ?? raw.total ?? raw.meta?.total ?? 0);
    const rawPages = Number(raw.total_pages ?? raw.pages ?? raw.meta?.total_pages ?? 0);

    // Normaliza sem filtrar por preço aqui — filtro agressivo foi movido para fora
    const buildings = list.map(normalizeBuilding);

    return {
      buildings,
      rawCount:   list.length,
      rawTotal,
      rawPages,
      httpStatus: resp.status,
      rawSample:  list[0] ?? null,
    };
  } catch (e) {
    return { buildings: [], rawCount: 0, rawTotal: 0, rawPages: 0, httpStatus: 0, rawSample: null, error: String(e) };
  }
}

// ── Busca por localização ─────────────────────────────────────────────────────
//
// ARQUITETURA: Vercel é stateless. Sem cache de módulo para o catálogo.
//
// Estratégia: busca p1 para descobrir total_pages real, depois dispara as
// páginas restantes em paralelo (até MAX_CITY_PAGES).
// Assim não buscamos páginas além do que a API tem.

const MAX_CITY_PAGES = 15; // teto de segurança: 15 × 200 = 3.000 imóveis

async function fetchByLocation(
  token: string,
  city: string,
  neighborhood: string,
  filters: {
    minPrice?: string | null;
    maxPrice?: string | null;
    bedroomsMin?: string | null;
    bedroomsMax?: string | null;
    status?: string | null;
  },
  page: number,
  returnAll = false,
): Promise<NextResponse> {
  const cityTarget = city || 'São Paulo';

  // ── Passo 1: busca página 1 para descobrir quantas páginas existem ────────
  const p1 = await fetchCityPage(token, cityTarget, 1);

  // total_pages real da API (ou teto de segurança)
  const totalPagesFromAPI = p1.rawPages > 0 ? p1.rawPages : MAX_CITY_PAGES;
  const pagesToFetch      = Math.min(totalPagesFromAPI, MAX_CITY_PAGES);

  // ── Passo 2: busca páginas 2..N em paralelo ────────────────────────────────
  const restResults: PageResult[] = pagesToFetch > 1
    ? await Promise.all(
        Array.from({ length: pagesToFetch - 1 }, (_, i) =>
          fetchCityPage(token, cityTarget, i + 2),
        ),
      )
    : [];

  const allResults = [p1, ...restResults];
  const rawSample  = allResults.find(r => r.rawSample)?.rawSample ?? null;
  const addressDebug = rawSample ? (rawSample.address as Record<string, unknown>) ?? {} : null;

  // Agrega e deduplica
  let all = allResults.flatMap(r => r.buildings);

  // Remove duplicatas por id (antes de qualquer filtro)
  const seen = new Set<string>();
  all = all.filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true; });

  // ── Filtro leve de sanidade (preço > 0 OU sem preço — mantém imóveis consultar) ──
  all = all.filter(b => b.min_price == null || b.min_price >= 1000);

  // Bairros únicos
  const uniqueNeighborhoods = [...new Set(all.map(b => b.neighborhood).filter(Boolean))].sort();

  // Debug detalhado por página
  const perPageDebug = allResults.map((r, i) => ({
    page:       i + 1,
    http:       r.httpStatus,
    raw:        r.rawCount,
    normalized: r.buildings.length,
    error:      r.error,
  }));

  // ── Filtros do usuário ────────────────────────────────────────────────────
  if (neighborhood) {
    const nb = neighborhood.toLowerCase();
    all = all.filter(b => (b.neighborhood || '').toLowerCase().includes(nb));
  }

  if (filters.minPrice)    all = all.filter(b => (b.min_price  ?? 0) >= Number(filters.minPrice));
  if (filters.maxPrice)    all = all.filter(b => (b.min_price  ?? 0) <= Number(filters.maxPrice));
  if (filters.bedroomsMin) all = all.filter(b => (b.bedrooms_max ?? 99) >= Number(filters.bedroomsMin));
  if (filters.bedroomsMax && filters.bedroomsMax !== '99')
                           all = all.filter(b => (b.bedrooms_min ?? 0) <= Number(filters.bedroomsMax));
  if (filters.status) {
    const byStatus = all.filter(b => b.status_norm === filters.status);
    if (byStatus.length > 0) all = byStatus;
  }

  const debugBlock = {
    total_after_filters:  all.length,
    api_total_count:      p1.rawTotal,
    api_total_pages:      p1.rawPages,
    pages_fetched:        allResults.filter(r => r.rawCount > 0).length,
    pages_with_errors:    allResults.filter(r => r.error).length,
    unique_neighborhoods: uniqueNeighborhoods.length,
    per_page:             perPageDebug,
    address_keys:         addressDebug ? Object.keys(addressDebug) : [],
    raw_sample_keys:      rawSample ? Object.keys(rawSample) : [],
  };

  // all=1: retorna todos sem paginação (para mapa client-side)
  if (returnAll) {
    return NextResponse.json({
      buildings: all,
      total:     all.length,
      page:      1,
      pages:     1,
      source:    'location_all',
      city:      cityTarget,
      _debug:    debugBlock,
    });
  }

  // Paginação server-side (20 por página)
  const PER_PAGE = 20;
  const start    = (page - 1) * PER_PAGE;

  return NextResponse.json({
    buildings:           all.slice(start, start + PER_PAGE),
    total:               all.length,
    page,
    pages:               Math.ceil(all.length / PER_PAGE) || 1,
    source:              'location',
    city:                cityTarget,
    neighborhood_filter: neighborhood || null,
    _debug:              debugBlock,
  });
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
    const bedroomsMin  = searchParams.get('bedrooms_min');
    const bedroomsMax  = searchParams.get('bedrooms_max');
    const statusReq    = searchParams.get('status');
    const q            = searchParams.get('q');

    // ── Mock ──────────────────────────────────────────────────────────────────
    if (process.env.USE_MOCK === 'true') {
      let buildings = MOCK_BUILDINGS.map(b => ({ ...b, status_norm: normalizeStatus(b.status) }));
      if (minPrice)                            buildings = buildings.filter(b => (b.min_price ?? 0) >= Number(minPrice));
      if (maxPrice)                            buildings = buildings.filter(b => (b.min_price ?? 0) <= Number(maxPrice));
      if (bedroomsMin)                         buildings = buildings.filter(b => (b.bedrooms_max ?? 0) >= Number(bedroomsMin));
      if (bedroomsMax && bedroomsMax !== '99') buildings = buildings.filter(b => (b.bedrooms_min ?? 0) <= Number(bedroomsMax));
      if (statusReq)    buildings = buildings.filter(b => b.status_norm === statusReq);
      if (neighborhood) buildings = buildings.filter(b => (b.neighborhood || '').toLowerCase().includes(neighborhood.toLowerCase()));
      else if (q)       buildings = buildings.filter(b => [b.name, b.neighborhood, b.city, b.developer].join(' ').toLowerCase().includes(q.toLowerCase()));
      return NextResponse.json({ buildings, total: buildings.length, page: 1, pages: 1, source: 'mock' });
    }

    const token = await getToken();

    // ── Com localização → busca + filtro server-side ──────────────────────────
    // all=1: retorna todos sem paginação (usado pelo mapa client-side)
    if (neighborhood || city || returnAll) {
      return fetchByLocation(
        token, city || 'São Paulo', neighborhood,
        { minPrice, maxPrice, bedroomsMin, bedroomsMax, status: statusReq },
        page,
        returnAll,
      );
    }

    // ── Sem localização → query direta à Orulo (suporta filtros nativos) ──────
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
    let buildings = rawList.map(normalizeBuilding).filter(b => b.min_price && b.min_price >= 1000);

    if (statusReq) {
      const filtered = buildings.filter(b => b.status_norm === statusReq);
      if (filtered.length > 0) buildings = filtered;
    }

    return NextResponse.json({
      buildings,
      total:  raw.total       ?? buildings.length,
      page,
      pages:  raw.total_pages ?? raw.pages ?? 1,
      source: 'orulo',
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[api/orulo]', message);
    if (message.includes('não configurados'))
      return NextResponse.json({ error: 'Integracao Orulo nao configurada.' }, { status: 500 });
    if (message.includes('401') || message.includes('403')) {
      _tokenCache = { token: null, expiresAt: 0 };
      return NextResponse.json({ error: 'Credenciais Orulo invalidas.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro ao buscar imoveis.' }, { status: 500 });
  }
}
   
