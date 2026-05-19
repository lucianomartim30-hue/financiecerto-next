import { NextRequest, NextResponse } from 'next/server';

const ORULO_BASE = 'https://www.orulo.com.br';

// ── Slug helper (duplicado aqui para evitar import de lib em route) ────────────
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Dados estáticos ───────────────────────────────────────────────────────────
// Bairros de São Paulo Capital
const NEIGHBORHOODS_SP = [
  'Moema','Itaim Bibi','Brooklin','Campo Belo','Vila Olímpia','Pinheiros',
  'Vila Madalena','Perdizes','Lapa','Santo Amaro','Vila Mariana','Ipiranga',
  'Jabaquara','Saúde','Cursino','Sacomã','Interlagos','Campo Grande',
  'Santana','Tatuapé','Mooca','Penha','Vila Matilde','Itaquera',
  'São Mateus','Vila Prudente','Aricanduva','Vila Formosa','Vila Carrão',
  'Tucuruvi','Casa Verde','Cachoeirinha','Vila Maria','Vila Guilherme',
  'Pirituba','Jardins','Cerqueira César','Paraíso','Bela Vista','Consolação',
  'Higienópolis','Santa Cecília','República','Liberdade','Butantã',
  'Alto de Pinheiros','Pacaembu','Pompeia','Barra Funda','Sumaré',
  'Vila Hamburguesa','Vila Leopoldina','Aclimação','Vila Clementino','Tremembé',
  'Campo Limpo','Capão Redondo','Morumbi','Jardim São Luís','Cidade Dutra',
  'Pedreira','Socorro','Grajaú','Parelheiros','Cidade Tiradentes',
];

// Municípios da RMSP
const CITIES_RMSP = [
  'São Paulo','Guarulhos','Osasco','Barueri','Alphaville',
  'Santo André','São Bernardo do Campo','São Caetano do Sul',
  'Diadema','Mauá','Ribeirão Pires','Santana de Parnaíba',
  'Cotia','Taboão da Serra','Carapicuíba','Mogi das Cruzes',
  'Suzano','Embu das Artes','Itaquaquecetuba',
];

// ── Token em memória ──────────────────────────────────────────────────────────
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

// ── Handler ───────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() || '';

  if (q.length < 2) {
    return NextResponse.json({ neighborhoods: [], cities: [], buildings: [] });
  }

  const ql = q.toLowerCase();

  // ── 1. Bairros (estático, instantâneo) ────────────────────────────────────
  const neighborhoods = NEIGHBORHOODS_SP
    .filter(nb => nb.toLowerCase().includes(ql))
    .slice(0, 6)
    .map(nb => ({
      label: `${nb}, São Paulo – SP`,
      slug:  `${toSlug(nb)}-sp`,
      type:  'neighborhood' as const,
    }));

  // ── 2. Cidades RMSP (estático) ────────────────────────────────────────────
  const cities = CITIES_RMSP
    .filter(c => c.toLowerCase().includes(ql))
    .slice(0, 3)
    .map(c => ({
      label: `${c} – SP`,
      slug:  `${toSlug(c)}-sp`,
      type:  'city' as const,
    }));

  // ── 3. Empreendimentos via Orulo (busca por nome no servidor) ─────────────
  // O parâmetro q= da API Orulo pesquisa pelo nome do empreendimento server-side.
  // Rápido: apenas 1 request, retorna até 8 sugestões.
  let buildings: {
    label: string; id: string; neighborhood: string; slug: string; type: 'building';
  }[] = [];

  try {
    const token = await getToken();
    const qs = new URLSearchParams({ state: 'SP', q, per_page: '8', page: '1' });
    const resp = await fetch(`${ORULO_BASE}/api/v2/buildings?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (resp.ok) {
      const raw  = await resp.json();
      const list = (raw.buildings ?? raw.data ?? []) as Record<string, unknown>[];
      buildings = list.slice(0, 5).map(b => {
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
    }
  } catch { /* timeout ou rede — degradar sem quebrar */ }

  return NextResponse.json({ neighborhoods, cities, buildings });
}
