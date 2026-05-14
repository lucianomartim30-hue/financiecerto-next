import { NextRequest, NextResponse } from 'next/server';

const ORULO_BASE = 'https://www.orulo.com.br';

// ── Mock para desenvolvimento local ──────────────────────────────────────────
const MOCK_BUILDINGS = [
  { id: '1', name: 'Residencial Vila Madalena', developer: 'Construtora ABC', min_price: 320000, max_price: 450000, bedrooms_min: 2, bedrooms_max: 3, neighborhood: 'Vila Madalena', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Pronto' },
  { id: '2', name: 'Jardins Exclusive', developer: 'MRV Engenharia', min_price: 280000, max_price: 380000, bedrooms_min: 1, bedrooms_max: 2, neighborhood: 'Jardins', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Na Planta' },
  { id: '3', name: 'Moema Garden', developer: 'Cyrela', min_price: 650000, max_price: 900000, bedrooms_min: 2, bedrooms_max: 4, neighborhood: 'Moema', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Pronto' },
  { id: '4', name: 'Pinheiros Living', developer: 'Even', min_price: 480000, max_price: 620000, bedrooms_min: 1, bedrooms_max: 3, neighborhood: 'Pinheiros', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Em Obras' },
  { id: '5', name: 'Brooklin Smart', developer: 'Trisul', min_price: 350000, max_price: 500000, bedrooms_min: 2, bedrooms_max: 2, neighborhood: 'Brooklin', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Na Planta' },
  { id: '6', name: 'Itaim Bibi Tower', developer: 'Helbor', min_price: 900000, max_price: 1400000, bedrooms_min: 2, bedrooms_max: 4, neighborhood: 'Itaim Bibi', city: 'São Paulo', state: 'SP', photo: null, orulo_url: 'https://orulo.com.br', status: 'Pronto' },
];

let _tokenCache = { token: null as string | null, expiresAt: 0 };

async function getToken(): Promise<string> {
  const now = Date.now();
  if (_tokenCache.token && now < _tokenCache.expiresAt) {
    return _tokenCache.token;
  }

  const clientId = process.env.ORULO_CLIENT_ID;
  const clientSecret = process.env.ORULO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('ORULO_CLIENT_ID ou ORULO_CLIENT_SECRET não configurados.');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  });

  const resp = await fetch(`${ORULO_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Órulo token error ${resp.status}: ${text.slice(0, 200)}`);
  }

  const data = await resp.json();
  const token = data.access_token;
  if (!token) throw new Error('Token não retornado pela Órulo.');

  _tokenCache = { token, expiresAt: now + 20 * 60 * 60 * 1000 };
  return token;
}

function normalizeBuilding(b: Record<string, unknown>) {
  const developer = (b.developer as Record<string, string> | null)?.name || (b.developer_name as string) || '';
  const address = (b.address as Record<string, string>) || {};
  const img = (b.default_image as Record<string, string>) || {};

  return {
    id: String(b.id),
    name: (b.name as string) || 'Empreendimento',
    developer,
    min_price: (b.min_price as number) ?? null,
    max_price: (b.max_price as number) ?? null,
    bedrooms_min: (b.min_bedrooms as number) ?? null,
    bedrooms_max: (b.max_bedrooms as number) ?? null,
    neighborhood: address.area || address.neighborhood || '',
    city: address.city || '',
    state: address.state || '',
    photo: img['520x280'] || img['200x140'] || null,
    sharing_url: (b.sharing_url as string) || null,
    orulo_url: (b.sharing_url as string) || (b.orulo_url as string) || `${ORULO_BASE}/buildings/${b.id}`,
    status: (b.status as string) || '',
    updated_at: (b.updated_at as string) || null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const city = searchParams.get('city') || 'São Paulo';
    const state = searchParams.get('state') || 'SP';

    // Mock para desenvolvimento local (quando API Órulo rejeita localhost)
    if (process.env.USE_MOCK === 'true') {
      let buildings = MOCK_BUILDINGS;
      if (minPrice) buildings = buildings.filter(b => b.min_price >= Number(minPrice));
      if (maxPrice) buildings = buildings.filter(b => b.min_price <= Number(maxPrice));
      return NextResponse.json({ buildings, total: buildings.length, page: 1, pages: 1, source: 'mock' });
    }

    const token = await getToken();

    const qs = new URLSearchParams();
    qs.set('page', String(page));
    qs.set('per_page', '50');
    if (minPrice) qs.set('min_price', minPrice);
    if (maxPrice) qs.set('max_price', maxPrice);
    if (state) qs.set('state', state);
    if (city) qs.set('city', city);

    const resp = await fetch(`${ORULO_BASE}/api/v2/buildings?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Órulo buildings error ${resp.status}: ${text.slice(0, 200)}`);
    }

    const raw = await resp.json();
    const rawList = (raw.buildings ?? raw.data ?? raw.results ?? []) as Record<string, unknown>[];
    const buildings = rawList
      .map(normalizeBuilding)
      .filter(b => b.min_price && b.min_price >= 1000);

    return NextResponse.json({
      buildings,
      total: raw.total ?? buildings.length,
      page,
      pages: raw.total_pages ?? raw.pages ?? 1,
      source: 'orulo',
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[api/orulo]', message);

    if (message.includes('não configurados')) {
      return NextResponse.json({ error: 'Integração Órulo não configurada.' }, { status: 500 });
    }
    if (message.includes('401') || message.includes('403')) {
      _tokenCache = { token: null, expiresAt: 0 };
      return NextResponse.json({ error: 'Credenciais Órulo inválidas.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro ao buscar imóveis.' }, { status: 500 });
  }
}
