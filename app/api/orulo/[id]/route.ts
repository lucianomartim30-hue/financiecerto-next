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
      min_price: 320000, max_price: 450000,
      bedrooms_min: 2, bedrooms_max: 3,
      area_min: 62, area_max: 85,
      bathrooms_min: 2, bathrooms_max: 2,
      vagas_min: 1, vagas_max: 1,
      neighborhood: 'Vila Madalena', city: 'São Paulo', state: 'SP',
      status: 'Pronto',
      description: 'Empreendimento moderno com acabamento de alto padrão, localizado em uma das regiões mais valorizadas de São Paulo. Próximo a restaurantes, bares e transporte público.',
      photos: [],
      amenities: ['Academia', 'Piscina', 'Salão de Festas', 'Churrasqueira', 'Playground', 'Portaria 24h', 'Elevador'],
      address_full: 'Rua Aspicuelta, 350 – Vila Madalena, São Paulo – SP',
      sharing_url: null,
      typologies: [
        { type: '2 dorms', area: '62 m²', price: 'R$ 320.000' },
        { type: '3 dorms', area: '85 m²', price: 'R$ 450.000' },
      ],
    },
  };
  return mocks[id] || null;
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

    const developer = (b.developer as Record<string, string> | null)?.name || (b.developer_name as string) || '';
    const address = (b.address as Record<string, string>) || {};
    const images = (b.images as Record<string, string>[] | null) || [];
    const defaultImg = (b.default_image as Record<string, string>) || {};

    // Montar lista de fotos (até 12)
    const photos: string[] = [];
    if (defaultImg['520x280']) photos.push(defaultImg['520x280']);
    for (const img of images.slice(0, 12)) {
      const url = img['520x280'] || img['200x140'] || img.url || '';
      if (url && !photos.includes(url)) photos.push(url);
    }

    // Amenidades/diferenciais
    const amenities: string[] = [];
    const feats = (b.amenities ?? b.features ?? b.differentials ?? []) as Record<string, unknown>[];
    for (const f of feats) {
      if (f.name) amenities.push(f.name as string);
      else if (typeof f === 'string') amenities.push(f);
    }

    // Tipologias (quadro de áreas)
    const typologies = ((b.typologies ?? b.apartments ?? []) as Record<string, unknown>[]).map((t) => ({
      type: (t.name ?? t.type ?? `${t.bedrooms} dorms`) as string,
      area: t.area ? `${t.area} m²` : '',
      price: t.price ? `R$ ${Number(t.price).toLocaleString('pt-BR')}` : 'Consultar',
    }));

    return NextResponse.json({
      id: String(b.id),
      name: (b.name as string) || 'Empreendimento',
      developer,
      min_price: (b.min_price as number) ?? null,
      max_price: (b.max_price as number) ?? null,
      bedrooms_min: (b.min_bedrooms as number) ?? null,
      bedrooms_max: (b.max_bedrooms as number) ?? null,
      area_min: (b.min_area as number) ?? null,
      area_max: (b.max_area as number) ?? null,
      bathrooms_min: (b.min_bathrooms as number) ?? null,
      bathrooms_max: (b.max_bathrooms as number) ?? null,
      vagas_min: (b.min_parking_spots as number) ?? null,
      vagas_max: (b.max_parking_spots as number) ?? null,
      neighborhood: address.area || address.neighborhood || '',
      city: address.city || '',
      state: address.state || '',
      address_full: [address.street, address.number, address.area || address.neighborhood, address.city].filter(Boolean).join(', '),
      status: (b.status as string) || '',
      description: (b.description as string) || '',
      photos,
      amenities,
      typologies,
      sharing_url: (b.sharing_url as string) || null,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error(`[api/orulo/${id}]`, msg);
    return NextResponse.json({ error: 'Erro ao buscar imóvel.' }, { status: 500 });
  }
}
