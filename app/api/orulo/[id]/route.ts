import { NextRequest, NextResponse } from 'next/server';

const ORULO_BASE = 'https://www.orulo.com.br';

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

function pickUrl(obj: Record<string, string> | null | undefined): string {
  if (!obj) return '';
  return obj['1200x628'] || obj['840x560'] || obj['520x280'] || obj['200x140'] || obj.url || obj.image_url || '';
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
    const resp = await fetch(`${ORULO_BASE}/api/v2/buildings/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (resp.status === 404) return NextResponse.json({ error: 'Imóvel não encontrado.' }, { status: 404 });
    if (!resp.ok) throw new Error(`Órulo building/${id} error ${resp.status}`);

    const raw = await resp.json();
    const b = raw.building ?? raw;

    const devObj = (b.developer as Record<string, unknown> | null) ?? {};
    const developer = (devObj.name as string) || (b.developer_name as string) || '';
    const developer_logo = (devObj.logo as string) || (devObj.image as string) || null;
    const developer_website = (devObj.website as string) || null;

    const address = (b.address as Record<string, unknown>) || {};
    const images = (b.images as Record<string, string>[] | null) || [];
    const defaultImg = (b.default_image as Record<string, string>) || {};

    // Fotos (até 20)
    const photos: string[] = [];
    const mainPhoto = pickUrl(defaultImg as Record<string, string>);
    if (mainPhoto) photos.push(mainPhoto);
    for (const img of images.slice(0, 20)) {
      const url = pickUrl(img as Record<string, string>);
      if (url && !photos.includes(url)) photos.push(url);
    }

    // Plantas (blueprints)
    const bpRaw = (b.blueprints ?? b.floor_plans ?? b.plants ?? []) as Record<string, unknown>[];
    const blueprints = bpRaw.map(bp => ({
      name: (bp.name ?? bp.label ?? bp.description ?? '') as string,
      url: pickUrl((bp.image ?? bp) as Record<string, string>),
    })).filter(bp => bp.url);

    // Amenidades
    const amenities: string[] = [];
    const feats = (b.amenities ?? b.features ?? b.differentials ?? []) as Record<string, unknown>[];
    for (const f of feats) {
      if (f.name) amenities.push(f.name as string);
      else if (typeof f === 'string') amenities.push(f);
    }

    // Tipologias enriquecidas
    const typologies = ((b.typologies ?? b.apartments ?? []) as Record<string, unknown>[]).map((t) => {
      const tImg = (t.images as Record<string, string>[])?.[0] ?? (t.image as Record<string, string>) ?? null;
      const tBp = (t.blueprints as Record<string, string>[])?.[0] ?? null;
      return {
        type: (t.name ?? t.type ?? `${t.bedrooms ?? '?'} dorms`) as string,
        bedrooms: (t.bedrooms ?? t.rooms ?? null) as number | null,
        bathrooms: (t.bathrooms ?? t.baths ?? null) as number | null,
        vagas: (t.garages ?? t.parking_spots ?? t.vagas ?? null) as number | null,
        