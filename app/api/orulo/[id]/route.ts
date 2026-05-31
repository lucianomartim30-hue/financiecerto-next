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

    // ── Fotos ──────────────────────────────────────────────────────────────────
    // A default_image vem com URLs completas; o array images[] vem só com IDs.
    const photos: string[] = [];
    const defaultImg = (b.default_image as Record<string, string>) || {};
    const mainPhoto = pickUrl(defaultImg);
    if (mainPhoto) photos.push(mainPhoto);

    const imagesRaw = ((b.images ?? b.photos ?? b.building_images ?? b.building_photos ?? []) as Record<string, unknown>[]);
    for (const img of imagesRaw.slice(0, 30)) {
      // Orulo v2 aninha as URLs dentro de img.image = { '1024x1024': '...', '520x280': '...' }
      // Verificamos primeiro o objeto aninhado (URLs reais do CDN), depois campos de raiz,
      // e só como último recurso construímos a URL via ID.
      const nested = (img.image ?? img.images) as Record<string, string> | undefined;
      const urlFromNested = nested ? pickUrl(nested) : '';
      const urlFromFields = pickUrl(img as Record<string, string>);
      const imgId = (img.id ?? img['image_id']) as string | number | undefined;
      const url = urlFromNested || urlFromFields || (imgId ? imageUrl(imgId) : '');
      if (url && !photos.includes(url)) photos.push(url);
    }

    // ── Plantas baixas ─────────────────────────────────────────────────────────
    // floor_plans[] tem a mesma estrutura: { id, description, type, associations }
    const floorPlansRaw = (b.floor_plans ?? b.blueprints ?? b.plants ?? []) as Record<string, unknown>[];
    const blueprints = floorPlansRaw.map(bp => {
      const bpId = (bp.id ?? bp['image_id']) as string | number | undefined;
      const url = bpId
        ? imageLargeUrl(bpId)   // plantas em alta resolução
        : pickUrl((bp.image ?? bp) as Record<string, string>);
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
        price:        price ? `R$ ${price.toLocaleString('pt-BR')}` : 'Consultar',
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
      photos,
      blueprints,
      amenities,
      typologies,
      sharing_url: (b.orulo_url as string) || (b.sharing_url as string) || null,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error(`[api/orulo/${id}]`, msg);
    return NextResponse.json({ error: 'Erro ao buscar imóvel.' }, { status: 500 });
  }
}
