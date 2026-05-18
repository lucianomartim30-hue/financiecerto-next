import { NextRequest, NextResponse } from 'next/server';

const ORULO_BASE = 'https://www.orulo.com.br';

const MOCK_BUILDINGS = [
  { id: '1', name: 'Residencial Vila Madalena', developer: 'Construtora ABC', min_price: 320000, max_price: 450000, bedrooms_min: 2, bedrooms_max: 3, area_min: 62, area_max: 85, bathrooms_min: 2, bathrooms_max: 2, vagas_min: 1, vagas_max: 1, neighborhood: 'Vila Madalena', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Pronto' },
  { id: '2', name: 'Jardins Exclusive', developer: 'MRV Engenharia', min_price: 280000, max_price: 380000, bedrooms_min: 1, bedrooms_max: 2, area_min: 38, area_max: 58, bathrooms_min: 1, bathrooms_max: 2, vagas_min: 1, vagas_max: 1, neighborhood: 'Jardins', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Na Planta' },
  { id: '3', name: 'Moema Garden', developer: 'Cyrela', min_price: 650000, max_price: 900000, bedrooms_min: 2, bedrooms_max: 4, area_min: 80, area_max: 140, bathrooms_min: 2, bathrooms_max: 3, vagas_min: 2, vagas_max: 2, neighborhood: 'Moema', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Pronto' },
  { id: '4', name: 'Vila Mariana Park', developer: 'Even', min_price: 480000, max_price: 620000, bedrooms_min: 1, bedrooms_max: 3, area_min: 45, area_max: 90, bathrooms_min: 1, bathrooms_max: 2, vagas_min: 1, vagas_max: 1, neighborhood: 'Vila Mariana', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Em Obras' },
  { id: '5', name: 'Jabaquara Residences', developer: 'Trisul', min_price: 250000, max_price: 350000, bedrooms_min: 2, bedrooms_max: 2, area_min: 55, area_max: 70, bathrooms_min: 2, bathrooms_max: 2, vagas_min: 1, vagas_max: 1, neighborhood: 'Jabaquara', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Na Planta' },
];

let _tokenCache = { token: null as string | null, expiresAt: 0 };

async function getToken(): Promise<string> {
  const now = Date.now();
  if (_tokenCache.token && now < _tokenCache.expiresAt) return _tokenCache.token;
  const clientId = process.env.ORULO_CLIENT_ID;
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

function normalizeStatus(raw: string): string {
  const s = (raw || '').toLowerCase().trim();
  if (s.includes('planta'))                                                   return 'na planta';
  if (s.includes('lança') || s.includes('lanca'))                            return 'lançamento';
  if (s.includes('constru') || s.includes('obra') || s.includes('andamento')) return 'em obras';
  if (s.includes('pronto') || s.includes('entreg') || s.includes('conclui')) return 'pronto';
  return s;
}

function normalizeBuilding(b: Record<string, unknown>) {
  const developer = (b.developer as Record<string, string> | null)?.name || (b.developer_name as string) || '';
  const address = (b.address as Record<string, string>) || {};
  const img = (b.default_image as Record<string, string>) || {};
  return {
    id:            String(b.id),
    name:          (b.name as string) || 'Empreendimento',
    developer,
    min_price:     (b.min_price as number)    ?? null,
    max_price:     (b.max_price as number)    ?? null,
    bedrooms_min:  (b.min_bedrooms as number) ?? null,
    bedrooms_max:  (b.max_bedrooms as number) ?? null,
    area_min:      (b.min_area as number)     ?? (b.area_min as number)      ?? null,
    area_max:      (b.max_area as number)     ?? (b.area_max as number)      ?? null,
    bathrooms_min: (b.min_bathrooms as number)?? (b.bathrooms_min as number) ?? null,
    bathrooms_max: (b.max_bathrooms as number)?? (b.bathrooms_max as number) ?? null,
    vagas_min:     (b.min_parking_spots as number) ?? (b.min_garages as number) ?? (b.vagas_min as number) ?? null,
    vagas_max:     (b.max_parking_spots as number) ?? (b.max_garages as number) ?? (b.vagas_max as number) ?? null,
    neighborhood:  address.area || address.neighborhood || '',
    address_full:  [address.street, address.number].filter(Boolean).join(', ') || '',
    street:        (address.street as string) || '',
    number:        (address.number as string) || '',
    city:          address.city  || '',
    state:         address.state || '',
    photo:         img['520x280'] || img['840x560'] || img['200x140'] || null,
    sharing_url:   (b.sharing_url as string) || null,
    orulo_url:     (b.sharing_url as string) || `${ORULO_BASE}/buildings/${b.id}`,
    status:        (b.status as string) || '',
    status_norm:   normalizeStatus((b.status as string) || ''),
    updated_at:    (b.updated_at as string) || null,
  };
}

type NormalizedBuilding = ReturnType<typeof normalizeBuilding>;

// ── Cache completo de imóveis SP ──────────────────────────────────────────────
// Busca TODAS as páginas da Orulo em paralelo para permitir filtro real por bairro.
// O campo address.neighborhood de cada building é o que usamos para filtrar —
// a API não suporta neighborhood= como parâmetro de query.

const CATALOG_CACHE: {
  buildings: NormalizedBuilding[];
  fetchedAt: number;
  building: boolean;
} = { buildings: [], fetchedAt: 0, building: false };

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 horas

async function fetchOnePage(token: string, qs: URLSearchParams, page: number): Promise<NormalizedBuilding[]> {
  const params = new URLSearchParams(qs);
  params.set('page', String(page));
  try {
    const resp = await fetch(`${ORULO_BASE}/api/v2/buildings?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return [];
    const raw = await resp.json();
    const list = (raw.buildings ?? raw.data ?? raw.results ?? []) as Record<string, unknown>[];
    return list.map(normalizeBuilding).filter(b => b.min_price && b.min_price >= 1000);
  } catch {
    return [];
  }
}

async function getOrBuildCatalog(token: string): Promise<NormalizedBuilding[]> {
  const now = Date.now();

  // Cache válido — retorna direto
  if (CATALOG_CACHE.buildings.length > 0 && now - CATALOG_CACHE.fetchedAt < CACHE_TTL) {
    return CATALOG_CACHE.buildings;
  }

  // Já está sendo construído — retorna o que tem (pode ser parcial)
  if (CATALOG_CACHE.building) return CATALOG_CACHE.buildings;

  CATALOG_CACHE.building = true;

  try {
    // 1. Descobrir total de páginas
    const probe = await fetch(
      `${ORULO_BASE}/api/v2/buildings?state=SP&city=S%C3%A3o+Paulo&per_page=1&page=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const probeData = await probe.json();
    const totalPages = Math.min(probeData.total_pages ?? probeData.pages ?? 1, 30);

    // 2. Busca todos em paralelo, em lotes de 10
    const BASE_QS = new URLSearchParams({ state: 'SP', city: 'São Paulo', per_page: '200' });
    const allBuildings: NormalizedBuilding[] = [];
    const BATCH = 10;

    for (let start = 1; start <= totalPages; start += BATCH) {
      const batch = Array.from(
        { length: Math.min(BATCH, totalPages - start + 1) },
        (_, i) => start + i
      );
      const results = await Promise.all(batch.map(p => fetchOnePage(token, BASE_QS, p)));
      allBuildings.push(...results.flat());
    }

    CATALOG_CACHE.buildings = allBuildings;
    CATALOG_CACHE.fetchedAt = now;
    CATALOG_CACHE.building = false;
    return allBuildings;

  } catch {
    CATALOG_CACHE.building = false;
    return CATALOG_CACHE.buildings;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page         = Math.max(1, parseInt(searchParams.get('page') || '1'));
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
      if (neighborhood) {
        const nl = neighborhood.toLowerCase();
        buildings = buildings.filter(b => (b.neighborhood || '').toLowerCase().includes(nl));
      } else if (q) {
        const ql = q.toLowerCase();
        buildings = buildings.filter(b => [b.name, b.neighborhood, b.city, b.developer].join(' ').toLowerCase().includes(ql));
      }
      return NextResponse.json({ buildings, total: buildings.length, page: 1, pages: 1, source: 'mock' });
    }

    const token = await getToken();

    // ── Busca por bairro: usa catálogo completo ───────────────────────────────
    if (neighborhood) {
      const catalog = await getOrBuildCatalog(token);

      const nb = neighborhood.toLowerCase();
      let filtered = catalog.filter(b => (b.neighborhood || '').toLowerCase().includes(nb));

      // Aplica filtros adicionais do catálogo
      if (minPrice)    filtered = filtered.filter(b => (b.min_price  ?? 0)  >= Number(minPrice));
      if (maxPrice)    filtered = filtered.filter(b => (b.min_price  ?? 0)  <= Number(maxPrice));
      if (bedroomsMin) filtered = filtered.filter(b => (b.bedrooms_max ?? 99) >= Number(bedroomsMin));
      if (bedroomsMax && bedroomsMax !== '99')
                       filtered = filtered.filter(b => (b.bedrooms_min ?? 0)  <= Number(bedroomsMax));
      if (statusReq) {
        const byStatus = filtered.filter(b => b.status_norm === statusReq);
        if (byStatus.length > 0) filtered = byStatus;
      }

      // Paginação server-side
      const PER_PAGE = 20;
      const start    = (page - 1) * PER_PAGE;
      const paginated = filtered.slice(start, start + PER_PAGE);

      return NextResponse.json({
        buildings: paginated,
        total:     filtered.length,
        page,
        pages:     Math.ceil(filtered.length / PER_PAGE) || 1,
        source:    'catalog',
      });
    }

    // ── Busca normal (sem bairro): query direta à Orulo ───────────────────────
    const qs = new URLSearchParams();
    qs.set('page', String(page));
    qs.set('per_page', statusReq ? '200' : '50');

    if (minPrice)                            qs.set('min_price',    minPrice);
    if (maxPrice)                            qs.set('max_price',    maxPrice);
    if (state)                               qs.set('state',        state);
    if (city)                                qs.set('city',         city);
    if (bedroomsMin)                         qs.set('min_bedrooms', bedroomsMin);
    if (bedroomsMax && bedroomsMax !== '99') qs.set('max_bedrooms', bedroomsMax);
    if (q)                                   qs.set('q',            q);

    const resp = await fetch(`${ORULO_BASE}/api/v2/buildings?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`Orulo buildings error ${resp.status}`);

    const raw = await resp.json();
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
