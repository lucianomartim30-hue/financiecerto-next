import { NextRequest, NextResponse } from 'next/server';

const ORULO_BASE = 'https://www.orulo.com.br';

const MOCK_BUILDINGS = [
  { id: '1', name: 'Residencial Vila Madalena', developer: 'Construtora ABC', min_price: 320000, max_price: 450000, bedrooms_min: 2, bedrooms_max: 3, area_min: 62, area_max: 85, bathrooms_min: 2, bathrooms_max: 2, vagas_min: 1, vagas_max: 1, neighborhood: 'Vila Madalena', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Pronto' },
  { id: '2', name: 'Jardins Exclusive', developer: 'MRV Engenharia', min_price: 280000, max_price: 380000, bedrooms_min: 1, bedrooms_max: 2, area_min: 38, area_max: 58, bathrooms_min: 1, bathrooms_max: 2, vagas_min: 1, vagas_max: 1, neighborhood: 'Jardins', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Na Planta' },
  { id: '3', name: 'Moema Garden', developer: 'Cyrela', min_price: 650000, max_price: 900000, bedrooms_min: 2, bedrooms_max: 4, area_min: 80, area_max: 140, bathrooms_min: 2, bathrooms_max: 3, vagas_min: 2, vagas_max: 2, neighborhood: 'Moema', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Pronto' },
  { id: '4', name: 'Pinheiros Living', developer: 'Even', min_price: 480000, max_price: 620000, bedrooms_min: 1, bedrooms_max: 3, area_min: 45, area_max: 90, bathrooms_min: 1, bathrooms_max: 2, vagas_min: 1, vagas_max: 1, neighborhood: 'Pinheiros', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Em Obras' },
  { id: '5', name: 'Brooklin Smart', developer: 'Trisul', min_price: 350000, max_price: 500000, bedrooms_min: 2, bedrooms_max: 2, area_min: 55, area_max: 70, bathrooms_min: 2, bathrooms_max: 2, vagas_min: 1, vagas_max: 1, neighborhood: 'Brooklin', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Na Planta' },
  { id: '6', name: 'Itaim Bibi Tower', developer: 'Helbor', min_price: 900000, max_price: 1400000, bedrooms_min: 2, bedrooms_max: 4, area_min: 95, area_max: 200, bathrooms_min: 2, bathrooms_max: 4, vagas_min: 2, vagas_max: 3, neighborhood: 'Itaim Bibi', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Pronto' },
  { id: '7', name: 'Studio Consolação', developer: 'Kallas', min_price: 220000, max_price: 280000, bedrooms_min: 1, bedrooms_max: 1, area_min: 28, area_max: 35, bathrooms_min: 1, bathrooms_max: 1, vagas_min: 0, vagas_max: 1, neighborhood: 'Consolação', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Pronto' },
  { id: '8', name: 'Tatuapé Residences', developer: 'Even', min_price: 380000, max_price: 520000, bedrooms_min: 2, bedrooms_max: 3, area_min: 60, area_max: 85, bathrooms_min: 2, bathrooms_max: 2, vagas_min: 1, vagas_max: 2, neighborhood: 'Tatuapé', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Lançamento' },
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

// Mapa de status canônico → valores aceitos pela Orulo API (situation param)
function toOruloSituation(status: string): string {
  const s = status.toLowerCase();
  if (s === 'na planta' || s === 'lançamento' || s === 'lancamento') return 'planta';
  if (s === 'em obras')   return 'construcao';
  if (s === 'pronto')     return 'pronto';
  return '';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page        = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const minPrice    = searchParams.get('min_price');
    const maxPrice    = searchParams.get('max_price');
    const state       = searchParams.get('state') || 'SP';
    const bedroomsMin = searchParams.get('bedrooms_min');
    const bedroomsMax = searchParams.get('bedrooms_max');
    const statusReq   = searchParams.get('status');
    const q           = searchParams.get('q');

    if (process.env.USE_MOCK === 'true') {
      let buildings = MOCK_BUILDINGS.map(b => ({ ...b, status_norm: normalizeStatus(b.status) }));
      if (minPrice)                          buildings = buildings.filter(b => (b.min_price ?? 0) >= Number(minPrice));
      if (maxPrice)                          buildings = buildings.filter(b => (b.min_price ?? 0) <= Number(maxPrice));
      if (bedroomsMin)                       buildings = buildings.filter(b => (b.bedrooms_max ?? 0) >= Number(bedroomsMin));
      if (bedroomsMax && bedroomsMax !== '99') buildings = buildings.filter(b => (b.bedrooms_min ?? 0) <= Number(bedroomsMax));
      if (statusReq) buildings = buildings.filter(b => b.status_norm === statusReq);
      if (q) {
        const ql = q.toLowerCase();
        buildings = buildings.filter(b => [b.name, b.neighborhood, b.city, b.developer].join(' ').toLowerCase().includes(ql));
      }
      return NextResponse.json({ buildings, total: buildings.length, page: 1, pages: 1, source: 'mock' });
    }

    const token = await getToken();
    const qs = new URLSearchParams();
    qs.set('page', String(page));
    // Aumenta per_page quando filtro de status ativo (precisamos de amostra maior para filtrar server-side)
    qs.set('per_page', statusReq ? '200' : '50');

    // Params confirmados e suportados pela Orulo API v2.
    // NÃO passamos neighborhood/situation/area — parâmetros não documentados
    // que retornam 0 resultados. Filtro de status é aplicado server-side.
    if (minPrice)                            qs.set('min_price',    minPrice);
    if (maxPrice)                            qs.set('max_price',    maxPrice);
    if (state)                               qs.set('state',        state);
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

    // ── Filtro de status server-side ─────────────────────────────────────────
    // Aplicado sobre a amostra retornada pela Orulo (per_page=200 quando ativo).
    // Se o filtro zerar os resultados (status raro na amostra), mantemos todos.
    if (statusReq) {
      const filtered = buildings.filter(b => b.status_norm === statusReq);
      if (filtered.length > 0) buildings = filtered;
      // Se filtered=0: mantém todos (evita tela vazia por sub-amostragem)
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
