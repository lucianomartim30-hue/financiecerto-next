import { NextRequest, NextResponse } from 'next/server';

const ORULO_BASE = 'https://www.orulo.com.br';

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Normaliza acento para comparacao sem acento
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Lista estatica expandida - SP Capital (distritos oficiais + bairros populares)
const NEIGHBORHOODS_SP = [
  // Centro
  'Centro','República','Sé','Bom Retiro','Brás','Bela Vista','Liberdade',
  'Consolação','Santa Cecília','Higienópolis','Pacaembu','Cambuci','Aclimação',
  // Zona Sul
  'Moema','Itaim Bibi','Brooklin','Campo Belo','Vila Olímpia','Santo Amaro',
  'Vila Mariana','Ipiranga','Jabaquara','Saúde','Cursino','Sacomã',
  'Interlagos','Campo Grande','Morumbi','Jardim São Luís','Cidade Dutra',
  'Pedreira','Socorro','Grajaú','Parelheiros','Campo Limpo','Capão Redondo',
  'Jardins','Vila Clementino','Vila Nova Conceição','Indianópolis','Panamby',
  'Chácara Klabin','Paraíso','Cerqueira César','Planalto Paulista',
  // Zona Oeste
  'Pinheiros','Vila Madalena','Perdizes','Lapa','Alto de Pinheiros','Butantã',
  'Pompeia','Barra Funda','Sumaré','Vila Hamburguesa','Vila Leopoldina',
  'Jaguaré','Rio Pequeno','Raposo Tavares','Jaraguá','Pirituba',
  // Zona Norte
  'Santana','Casa Verde','Cachoeirinha','Vila Maria','Vila Guilherme',
  'Tucuruvi','Tremembé','Jaçanã','Mandaqui','Brasilândia','Perus',
  'Freguesia do Ó','Limão','Vila Medeiros','Anhanguera',
  // Zona Leste
  'Tatuapé','Mooca','Penha','Vila Matilde','Itaquera','São Mateus',
  'Vila Prudente','Aricanduva','Vila Formosa','Vila Carrão','Sapopemba',
  'Ermelino Matarazzo','Ponte Rasa','Guaianases','Lajeado',
  'Cidade Tiradentes','São Miguel Paulista','Vila Jacuí','Iguatemi',
  'José Bonifácio','Itaim Paulista',
].sort();

// Municípios da Grande SP
const CITIES_RMSP = [
  'São Paulo','Guarulhos','Osasco','Barueri','Alphaville',
  'Santo André','São Bernardo do Campo','São Caetano do Sul',
  'Diadema','Mauá','Ribeirão Pires','Santana de Parnaíba',
  'Cotia','Taboão da Serra','Carapicuíba','Mogi das Cruzes',
  'Suzano','Embu das Artes','Itaquaquecetuba','Ferraz de Vasconcelos',
  'Cajamar','Franco da Rocha','Mairiporã','Arujá','Santa Isabel',
];

// Token Orulo
let _tokenCache = { token: null as string | null, expiresAt: 0 };

async function getToken(): Promise<string> {
  const now = Date.now();
  if (_tokenCache.token && now < _tokenCache.expiresAt) return _tokenCache.token;
  const clientId     = process.env.ORULO_CLIENT_ID;
  const clientSecret = process.env.ORULO_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Credenciais nao configuradas.');
  const resp = await fetch(`${ORULO_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials',
    }).toString(),
  });
  if (!resp.ok) throw new Error(`Token error ${resp.status}`);
  const data = await resp.json();
  if (!data.access_token) throw new Error('Token nao retornado.');
  _tokenCache = { token: data.access_token, expiresAt: now + 20 * 60 * 60 * 1000 };
  return data.access_token;
}

// Nominatim: busca bairros reais via OpenStreetMap
type NominatimResult = { label: string; slug: string; type: 'neighborhood' | 'city' };

async function searchNominatim(q: string): Promise<NominatimResult[]> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('countrycodes', 'br');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '12');

    const resp = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'FinancieCerto/1.0 (lucianomartim30@gmail.com)',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      signal: AbortSignal.timeout(3000),
    });

    if (!resp.ok) return [];
    const results = await resp.json() as Array<{
      display_name: string;
      type: string;
      class: string;
      address: Record<string, string>;
    }>;

    const seen = new Set<string>();
    const out: NominatimResult[] = [];

    for (const r of results) {
      const addr = r.address || {};
      // Only SP state
      if (addr.state !== 'São Paulo') continue;

      const city = addr.city || addr.town || addr.municipality || 'São Paulo';
      const nb = addr.suburb || addr.neighbourhood || addr.quarter || addr.village || addr.residential;

      if (nb && !seen.has(nb.toLowerCase())) {
        seen.add(nb.toLowerCase());
        out.push({
          label: `${nb}, ${city} – SP`,
          slug: `${toSlug(nb)}-sp`,
          type: 'neighborhood',
        });
      }
    }
    return out.slice(0, 6);
  } catch {
    return [];
  }
}

// Handler
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  if (q.length < 2) {
    return NextResponse.json({ neighborhoods: [], cities: [], buildings: [] });
  }

  const ql = norm(q);

  // 1. Estático instantâneo
  const staticNeighborhoods = NEIGHBORHOODS_SP
    .filter(nb => norm(nb).includes(ql))
    .slice(0, 5)
    .map(nb => ({
      label: `${nb}, São Paulo – SP`,
      slug: `${toSlug(nb)}-sp`,
      type: 'neighborhood' as const,
    }));

  const cities = CITIES_RMSP
    .filter(c => norm(c).includes(ql))
    .slice(0, 4)
    .map(c => ({
      label: `${c} – SP`,
      slug: `${toSlug(c)}-sp`,
      type: 'city' as const,
    }));

  // 2. Nominatim + Orulo em paralelo
  const [nominatimRes, buildingsRes] = await Promise.allSettled([
    searchNominatim(q),
    (async () => {
      const token = await getToken();
      const qs = new URLSearchParams({ state: 'SP', q, per_page: '8', page: '1' });
      const resp = await fetch(`${ORULO_BASE}/api/v2/buildings?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) return [] as Record<string, unknown>[];
      const raw = await resp.json();
      return (raw.buildings ?? raw.data ?? []) as Record<string, unknown>[];
    })(),
  ]);

  // Merge bairros: estático + Nominatim sem duplicatas
  const staticSlugs = new Set(staticNeighborhoods.map(n => n.slug));
  const nominatim = nominatimRes.status === 'fulfilled' ? nominatimRes.value : [];
  const extraNbs = nominatim
    .filter(n => !staticSlugs.has(n.slug))
    .map(n => ({ label: n.label, slug: n.slug, type: 'neighborhood' as const }));

  const neighborhoods = [...staticNeighborhoods, ...extraNbs].slice(0, 8);

  // Buildings
  const rawBuildings = buildingsRes.status === 'fulfilled' ? buildingsRes.value : [];
  const buildings = rawBuildings.slice(0, 5).map((b: Record<string, unknown>) => {
    const addr = (b.address as Record<string, unknown>) || {};
    const nb   = (addr.area as string) || (addr.neighborhood as string) || '';
    return {
      label:        (b.name as string) || 'Empreendimento',
      id:           String(b.id),
      neighborhood: nb,
      slug:         nb ? `${toSlug(nb)}-sp` : '',
      type:         'building' as const,
    };
  });

  return NextResponse.json({ neighborhoods, cities, buildings });
}
