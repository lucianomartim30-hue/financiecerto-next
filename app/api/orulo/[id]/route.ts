import { NextRequest, NextResponse } from 'next/server';
import { kvGetCatalog } from '@/lib/orulo-kv';
import { kvGetFotosOcultas } from '@/lib/fotos-ocultas-kv';
import { sessionToken } from '../../admin-auth/route';

const ORULO_BASE = 'https://www.orulo.com.br';
const ADMIN_COOKIE = 'admin_leads_session';

function isAdmin(req: NextRequest): boolean {
  const configured = process.env.ADMIN_LEADS_PASSWORD;
  if (!configured) return false;
  return req.cookies.get(ADMIN_COOKIE)?.value === sessionToken(configured);
}

// Extrai o id numérico da foto a partir da URL do CDN da Orulo (usado pra
// cruzar com a lista de fotos ocultas curada manualmente — ver fotos-ocultas-kv.ts).
function extrairIdDaUrl(url: string): string | null {
  const m = url.match(/\/(\d+)\.[a-z]+$/i);
  return m ? m[1] : null;
}

/**
 * Fallback quando a Orulo já removeu o imóvel da lista ativa (vendido,
 * despublicado) mas o nosso cache (KV) ainda não foi ressincronizado —
 * a listagem continua mostrando o card, e sem isso o clique caía num
 * "Imóvel não encontrado" (ver relato do usuário 2026-08-09/10). Serve os
 * dados já cacheados (mais leves, sem galeria completa) em vez de um erro.
 */
async function fallbackFromCache(id: string) {
  try {
    const catalog = await kvGetCatalog();
    const cached = catalog?.find(b => b.id === id);
    if (!cached) return null;
    return {
      id: cached.id,
      name: cached.name,
      developer: cached.developer,
      developer_logo: null,
      developer_website: null,
      min_price: cached.min_price,
      max_price: cached.max_price,
      bedrooms_min: cached.bedrooms_min,
      bedrooms_max: cached.bedrooms_max,
      area_min: cached.area_min,
      area_max: cached.area_max,
      bathrooms_min: cached.bathrooms_min,
      bathrooms_max: cached.bathrooms_max,
      vagas_min: cached.vagas_min,
      vagas_max: cached.vagas_max,
      neighborhood: cached.neighborhood,
      city: cached.city,
      state: cached.state,
      zipcode: '',
      address_full: cached.address_full,
      latitude: cached.lat,
      longitude: cached.lng,
      status: cached.status,
      delivery_date: cached.delivery_date,
      launch_date: null,
      total_units: null,
      stock: null,
      number_of_floors: null,
      number_of_towers: null,
      virtual_tour: null,
      finality: cached.finality || null,
      description: '',
      photos: cached.photo ? [cached.photo] : [],
      blueprints: [],
      amenities: [],
      typologies: [],
      sharing_url: cached.sharing_url || cached.orulo_url || null,
    };
  } catch {
    return null;
  }
}

let _tokenCache = { token: null as string | null, expiresAt: 0 };

async function getToken(): Promise<string> {
  const now = Date.now();
  if (_tokenCache.token && now < _tokenCache.expiresAt) return _tokenCache.token;

  const clientId = process.env.ORULO_CLIENT_ID;
  const clientSecret = process.env.ORULO_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Credenciais Órulo não configuradas.');

  const resp = await fetch(`${ORULO_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }).toString(),
  });
  if (!resp.ok) throw new Error(`Token error ${resp.status}`);
  const data = await resp.json();
  _tokenCache = { token: data.access_token, expiresAt: now + 20 * 60 * 60 * 1000 };
  return data.access_token;
}

// Mock detalhado para desenvolvimento
function getMock(id: string) {
  const mocks: Record<string, object> = {
    '1': {
      id: '1', name: 'Residencial Vila Madalena', developer: 'Construtora ABC',
      developer_logo: null, developer_website: null,
      min_price: 320000, max_price: 450000,
      bedrooms_min: 2, bedrooms_max: 3,
      area_min: 62, area_max: 85,
      bathrooms_min: 2, bathrooms_max: 2,
      vagas_min: 1, vagas_max: 1,
      neighborhood: 'Vila Madalena', city: 'São Paulo', state: 'SP',
      zipcode: '05433-010',
      status: 'Pronto',
      delivery_date: null,
      description: 'Empreendimento moderno com acabamento de alto padrão, localizado em uma das regiões mais valorizadas de São Paulo.',
      photos: [],
      blueprints: [],
      amenities: ['Academia', 'Piscina', 'Salão de Festas', 'Churrasqueira', 'Playground', 'Portaria 24h', 'Elevador'],
      address_full: 'Rua Aspicuelta, 350 – Vila Madalena, São Paulo – SP',
      latitude: -23.5505, longitude: -46.6333,
      sharing_url: null,
      typologies: [
        { type: '2 dorms', bedrooms: 2, bathrooms: 2, vagas: 1, area: '62 m²', private_area: '58 m²', total_area: '74 m²', price: 'R$ 320.000', photo: null },
        { type: '3 dorms', bedrooms: 3, bathrooms: 2, vagas: 1, area: '85 m²', private_area: '80 m²', total_area: '98 m²', price: 'R$ 450.000', photo: null },
      ],
    },
  };
  return mocks[id] || null;
}

// ── CDN Orulo ─────────────────────────────────────────────────────────────────
// Variantes confirmadas (debug 2026-05-27):
//   /thumb/                        ← 200×140  (key "200x140")
//   /featured_modern_without_watermark/ ← 520×280  (key "520x280")
//   /large/                        ← 1024×1024 (key "1024x1024")
//   /xlarge/                       ← 2280×1800 (key "2280x1800")
//
// Para images[] (só têm id, sem URL explícita) usamos /large/ como primária.
// O frontend tenta /xlarge/ → /large/ → /featured_modern_without_watermark/
// antes de mostrar placeholder — 404s individuais não afetam o total da galeria.
const ORULO_IMG_BASE = 'https://static.orulo.com.br/images/properties';

function imageUrl(id: string | number): string {
  return `${ORULO_IMG_BASE}/large/${id}.jpg`;
}
function imageLargeUrl(id: string | number): string {
  return `${ORULO_IMG_BASE}/large/${id}.jpg`;
}

// Busca as URLs reais de fotos/plantas via os endpoints dedicados da Orulo.
// Necessário porque os arrays images[]/floor_plans[] do building só trazem IDs
// numéricos — o nome de arquivo real no CDN é um hash (ex: cyoat7xnxktqn32eoj3wuuw5b8kz.jpg),
// não o ID. Adivinhar a URL a partir do ID numérico sempre resulta em 404.
// Doc: GET /buildings/{id}/images|floor_plans?dimensions[]=2280x1800&dimensions[]=1024x1024
async function fetchMediaUrlMap(id: string, token: string, kind: 'images' | 'floor_plans'): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const qs = new URLSearchParams([['dimensions[]', '2280x1800'], ['dimensions[]', '1024x1024']]);
    const resp = await fetch(`${ORULO_BASE}/api/v2/buildings/${id}/${kind}?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return map;
    const data = await resp.json();
    const items = (data[kind] ?? []) as Record<string, string>[];
    for (const item of items) {
      const url = item['2280x1800'] || item['1024x1024'];
      if (item.id && url) map.set(String(item.id), url);
    }
  } catch {
    // Endpoint indisponível — segue com o fallback de adivinhação existente
  }
  return map;
}

function pickUrl(obj: Record<string, string> | null | undefined): string {
  if (!obj) return '';
  // Se tem ID mas nenhuma URL de resolução conhecida, monta via CDN (large)
  if (obj.id && !obj['520x280'] && !obj['840x560'] && !obj['1024x1024'] && !obj['2280x1800'] && !obj['1200x628']) {
    return imageUrl(obj.id);
  }
  // Prefere a maior resolução disponível (xlarge > large > medium > small)
  return (
    obj['2280x1800'] ||   // xlarge — maior qualidade
    obj['1200x628']  ||   // variante horizontal HD
    obj['1024x1024'] ||   // large
    obj['840x560']   ||
    obj['520x280']   ||   // featured_modern_without_watermark
    obj['200x140']   ||   // thumb
    obj.url          ||
    obj.image_url    || ''
  );
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    // Mock local
    if (process.env.USE_MOCK === 'true') {
      const mock = getMock(id);
      if (!mock) return NextResponse.json({ error: 'Imóvel não encontrado.' }, { status: 404 });
      return NextResponse.json(mock);
    }

    const token = await getToken();
    const [resp, imageUrlMap, floorPlanUrlMap] = await Promise.all([
      fetch(`${ORULO_BASE}/api/v2/buildings/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetchMediaUrlMap(id, token, 'images'),
      fetchMediaUrlMap(id, token, 'floor_plans'),
    ]);

    if (resp.status === 404) {
      const fallback = await fallbackFromCache(id);
      if (fallback) return NextResponse.json(fallback);
      return NextResponse.json({ error: 'Imóvel não encontrado.' }, { status: 404 });
    }
    if (!resp.ok) throw new Error(`Órulo building/${id} error ${resp.status}`);

    const raw = await resp.json();
    const b = raw.building ?? raw;

    const devObj = (b.developer as Record<string, unknown> | null) ?? {};
    const developer = (devObj.name as string) || (b.developer_name as string) || '';
    const developer_logo = (devObj.logo as string) || (devObj.image as string) || null;
    const developer_website = (devObj.website as string) || null;

    const address = (b.address as Record<string, unknown>) || {};

    // ── Fotos ──────────────────────────────────────────────────────────────────
    // A default_image vem com URLs completas; o array images[] vem só com IDs.
    const photos: string[] = [];
    const defaultImg = (b.default_image as Record<string, string>) || {};
    const mainPhoto = pickUrl(defaultImg);
    if (mainPhoto) photos.push(mainPhoto);

    const imagesRaw = ((b.images ?? b.photos ?? b.building_images ?? b.building_photos ?? []) as Record<string, unknown>[]);
    for (const img of imagesRaw.slice(0, 30)) {
      const imgId = (img.id ?? img['image_id']) as string | number | undefined;
      // Prioridade: URL real buscada via /buildings/{id}/images (confiável) →
      // objeto aninhado img.image (quando a API já embute a URL) → campos de raiz →
      // último recurso: adivinhar via ID (geralmente resulta em 404, mantido por segurança)
      const urlFromMap = imgId ? imageUrlMap.get(String(imgId)) : undefined;
      const nested = (img.image ?? img.images) as Record<string, string> | undefined;
      const urlFromNested = nested ? pickUrl(nested) : '';
      const urlFromFields = pickUrl(img as Record<string, string>);
      const url = urlFromMap || urlFromNested || urlFromFields || (imgId ? imageUrl(imgId) : '');
      if (url && !photos.includes(url)) photos.push(url);
    }

    // Remove fotos marcadas manualmente como material de marketing pra
    // corretor/imobiliária (ver /admin/fotos) — não dá pra detectar isso
    // automaticamente: nem o campo type/description da Orulo nem a
    // proporção da imagem distinguem com segurança um banner de uma foto
    // real (ex: fachada de prédio alto também é retrato).
    const ocultas = await kvGetFotosOcultas(id);
    // /admin/fotos precisa ver as fotos ocultas também, pra poder reexibi-las —
    // só o painel autenticado recebe a lista completa com os ids de cada foto.
    const admin = isAdmin(req);
    const photosVisiveis = (admin || ocultas.size === 0)
      ? photos
      : photos.filter(url => {
          const imgId = extrairIdDaUrl(url);
          return !imgId || !ocultas.has(imgId);
        });

    // ── Plantas baixas ─────────────────────────────────────────────────────────
    // floor_plans[] tem a mesma estrutura: { id, description, type, associations }
    const floorPlansRaw = (b.floor_plans ?? b.blueprints ?? b.plants ?? []) as Record<string, unknown>[];
    const blueprints = floorPlansRaw.map(bp => {
      const bpId = (bp.id ?? bp['image_id']) as string | number | undefined;
      const url =
        (bpId ? floorPlanUrlMap.get(String(bpId)) : undefined) ||
        pickUrl((bp.image ?? bp) as Record<string, string>) ||
        (bpId ? imageLargeUrl(bpId) : '');   // último recurso — geralmente 404
      return {
        name: (bp.description ?? bp.name ?? bp.label ?? 'Planta') as string,
        url,
      };
    }).filter(bp => bp.url);

    // ── Amenidades / Diferenciais ──────────────────────────────────────────────
    // A API retorna features como array de strings simples
    const amenities: string[] = [];
    const featsRaw = (b.features ?? b.amenities ?? b.building_features ?? b.differentials ?? []) as unknown[];
    for (const f of featsRaw) {
      if (typeof f === 'string') amenities.push(f);
      else if (f && typeof f === 'object') {
        const fo = f as Record<string, unknown>;
        if (fo.name) amenities.push(fo.name as string);
      }
    }

    // ── Tipologias ─────────────────────────────────────────────────────────────
    const typologies = ((b.typologies ?? b.apartments ?? []) as Record<string, unknown>[]).map((t) => {
      // Tipologias não têm imagens embutidas — photo fica null
      const price = (t.discount_price ?? t.original_price ?? t.price ?? null) as number | null;
      return {
        type: (t.type ?? t.name ?? `${t.bedrooms ?? '?'} dorms`) as string,
        bedrooms:  (t.bedrooms ?? t.rooms ?? null) as number | null,
        bathrooms: (t.bathrooms ?? t.baths ?? null) as number | null,
        vagas:     (t.parking ?? t.garages ?? t.parking_spots ?? t.vagas ?? null) as number | null,
        suites:    (t.suites ?? null) as number | null,
        area:         t.private_area ? `${t.private_area}` : (t.area ? `${t.area}` : ''),
        private_area: t.private_area ? `${t.private_area}` : '',
        total_area:   t.total_area   ? `${t.total_area}`   : '',
        // Arredondado em reais inteiros — o resto do site nunca mostra centavos
        // (card financeiro, cards de listagem etc.), então exibir aqui os centavos
        // crus da Orulo criava dois valores visualmente diferentes pro mesmo preço.
        price:        price ? `R$ ${price.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : 'Consultar',
        stock:        (t.stock ?? null) as number | null,   // unidades disponíveis
        total_units:  (t.total_units ?? null) as number | null,
        photo:        null,
        blueprint:    null,
      };
    });

    // ── Vagas (fallback a partir das tipologias se nível do empreendimento for null) ──
    const vagasBldgMin = (b.min_parking as number) ?? (b.min_parking_spots as number) ?? (b.min_garages as number) ?? null;
    const vagasBldgMax = (b.max_parking as number) ?? (b.max_parking_spots as number) ?? (b.max_garages as number) ?? null;
    const vagasFromTypos = typologies.map(t => t.vagas).filter((v): v is number => v !== null);
    const vagas_min = vagasBldgMin ?? (vagasFromTypos.length > 0 ? Math.min(...vagasFromTypos) : null);
    const vagas_max = vagasBldgMax ?? (vagasFromTypos.length > 0 ? Math.max(...vagasFromTypos) : null);

    // ── Coordenadas ────────────────────────────────────────────────────────────
    const latitude  = (address.latitude  ?? b.latitude  ?? null) as number | null;
    const longitude = (address.longitude ?? b.longitude ?? null) as number | null;

    // ── Datas ──────────────────────────────────────────────────────────────────
    const delivery_date = (b.delivery_date ?? b.ready_at ?? b.opening_date ?? b.expected_delivery ?? b.delivered_at ?? null) as string | null;
    const launch_date   = (b.launch_date   ?? b.opening_date ?? null) as string | null;

    // ── CEP ────────────────────────────────────────────────────────────────────
    const zipcode = (address.zipcode ?? address.zip ?? address.postal_code ?? '') as string;

    return NextResponse.json({
      id: String(b.id),
      name: (b.name as string) || 'Empreendimento',
      developer,
      developer_logo,
      developer_website,
      min_price: (b.min_price as number) ?? null,
      max_price: (b.max_price as number) ?? null,
      bedrooms_min:  (b.min_bedrooms  as number) ?? null,
      bedrooms_max:  (b.max_bedrooms  as number) ?? null,
      area_min:      (b.min_area      as number) ?? null,
      area_max:      (b.max_area      as number) ?? null,
      bathrooms_min: (b.min_bathrooms as number) ?? null,
      bathrooms_max: (b.max_bathrooms as number) ?? null,
      vagas_min,
      vagas_max,
      neighborhood: (address.area ?? address.neighborhood ?? '') as string,
      city:    (address.city  ?? '') as string,
      state:   (address.state ?? '') as string,
      zipcode,
      address_full: [address.street_type, address.street, address.number, address.area ?? address.neighborhood, address.city].filter(Boolean).join(' '),
      latitude,
      longitude,
      status:        (b.stage  as string) || (b.status as string) || '',
      delivery_date,
      launch_date,
      total_units:      (b.total_units      as number) ?? null,
      stock:            (b.stock            as number) ?? null,   // unidades disponíveis (total)
      number_of_floors: (b.number_of_floors as number) ?? null,
      number_of_towers: (b.number_of_towers as number) ?? null,
      virtual_tour:     (b.virtual_tour     as string) || null,
      finality:         (b.finality         as string) || null,   // Residencial / Comercial
      description: (b.description as string) || '',
      photos: photosVisiveis,
      blueprints,
      amenities,
      typologies,
      sharing_url: (b.orulo_url as string) || (b.sharing_url as string) || null,
      // Só presente pro painel /admin/fotos — permite mostrar/reexibir fotos
      // ocultas, que o cliente comum nunca recebe no array `photos` acima.
      admin_fotos: admin
        ? photos.map(url => ({ url, id: extrairIdDaUrl(url), oculta: !!extrairIdDaUrl(url) && ocultas.has(extrairIdDaUrl(url) as string) }))
        : undefined,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error(`[api/orulo/${id}]`, msg);
    // Erro transitório (rede, timeout, rate-limit) — tenta servir do cache
    // antes de mostrar erro; melhor um dado levemente desatualizado do que nada.
    const fallback = await fallbackFromCache(id);
    if (fallback) return NextResponse.json(fallback);
    return NextResponse.json({ error: 'Erro ao buscar imóvel.' }, { status: 500 });
  }
}
