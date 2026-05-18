import { NextResponse } from 'next/server';

const ORULO_BASE = 'https://www.orulo.com.br';

let _tokenCache = { token: null as string | null, expiresAt: 0 };

async function getToken(): Promise<string> {
  const now = Date.now();
  if (_tokenCache.token && now < _tokenCache.expiresAt) return _tokenCache.token;
  const clientId     = process.env.ORULO_CLIENT_ID;
  const clientSecret = process.env.ORULO_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Credenciais Orulo não configuradas.');
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

// Cache bairros por 6h
let _bairrosCache: { data: LocationSuggestion[]; expiresAt: number } = { data: [], expiresAt: 0 };

interface LocationSuggestion {
  label: string;  // "Moema, São Paulo – SP"
  city: string;
  neighborhood: string;
  state: string;
}

// Fallback estático com toda a Região Metropolitana de SP
const RMSP_STATIC: LocationSuggestion[] = [
  // ── São Paulo – Centro ──────────────────────────────────────────────────────
  ...['Sé','República','Liberdade','Bela Vista','Consolação','Higienópolis',
      'Santa Cecília','Bom Retiro','Brás','Cambuci','Pari','Glicério'].map(n =>
    ({ label: `${n}, São Paulo – SP`, city: 'São Paulo', neighborhood: n, state: 'SP' })),
  // ── São Paulo – Oeste ───────────────────────────────────────────────────────
  ...['Pinheiros','Vila Madalena','Lapa','Perdizes','Pompeia','Sumaré',
      'Barra Funda','Água Branca','Pacaembu','Butantã','Vila Leopoldina',
      'Alto de Pinheiros','Itaim Bibi','Vila Olímpia','Vila Hamburguesa'].map(n =>
    ({ label: `${n}, São Paulo – SP`, city: 'São Paulo', neighborhood: n, state: 'SP' })),
  // ── São Paulo – Sul ─────────────────────────────────────────────────────────
  ...['Moema','Brooklin','Campo Belo','Santo Amaro','Campo Grande','Jabaquara',
      'Saúde','Vila Mariana','Ipiranga','Cursino','Sacomã','Interlagos',
      'Pedreira','Cidade Dutra','Grajaú','Parelheiros','Socorro'].map(n =>
    ({ label: `${n}, São Paulo – SP`, city: 'São Paulo', neighborhood: n, state: 'SP' })),
  // ── São Paulo – Norte ───────────────────────────────────────────────────────
  ...['Santana','Tucuruvi','Casa Verde','Cachoeirinha','Mandaqui','Jaçanã',
      'Tremembé','Brasilândia','Pirituba','Jaraguá','Perus','Anhanguera',
      'Vila Guilherme','Vila Maria','Vila Medeiros'].map(n =>
    ({ label: `${n}, São Paulo – SP`, city: 'São Paulo', neighborhood: n, state: 'SP' })),
  // ── São Paulo – Leste ───────────────────────────────────────────────────────
  ...['Tatuapé','Mooca','Belém','Penha','Vila Matilde','Sapopemba','Itaquera',
      'São Mateus','Guaianases','Cidade Tiradentes','Ermelino Matarazzo',
      'São Miguel Paulista','Artur Alvim','Vila Prudente','Vila Carrão',
      'Vila Formosa','Aricanduva','Jardim Helena','Iguatemi'].map(n =>
    ({ label: `${n}, São Paulo – SP`, city: 'São Paulo', neighborhood: n, state: 'SP' })),
  // ── São Paulo – Jardins e nobres ────────────────────────────────────────────
  ...['Jardins','Jardim Paulista','Jardim América','Jardim Europa','Cerqueira César',
      'Paulista','Avenida Paulista','Vila Nova Conceição','Chácara Klabin',
      'Paraíso','Vila Clementino','Mirandópolis','Planalto Paulista'].map(n =>
    ({ label: `${n}, São Paulo – SP`, city: 'São Paulo', neighborhood: n, state: 'SP' })),
  // ── Grande ABC ──────────────────────────────────────────────────────────────
  ...['Santo André','Vila Bastos','Campestre','Jardim','Utinga'].map(n =>
    ({ label: `${n}, Santo André – SP`, city: 'Santo André', neighborhood: n, state: 'SP' })),
  ...['São Bernardo do Campo','Rudge Ramos','Nova Petrópolis','Assunção','Alvarenga'].map(n =>
    ({ label: `${n}, São Bernardo do Campo – SP`, city: 'São Bernardo do Campo', neighborhood: n, state: 'SP' })),
  { label: 'São Caetano do Sul – SP', city: 'São Caetano do Sul', neighborhood: '', state: 'SP' },
  { label: 'Diadema – SP', city: 'Diadema', neighborhood: '', state: 'SP' },
  { label: 'Mauá – SP', city: 'Mauá', neighborhood: '', state: 'SP' },
  { label: 'Ribeirão Pires – SP', city: 'Ribeirão Pires', neighborhood: '', state: 'SP' },
  { label: 'Rio Grande da Serra – SP', city: 'Rio Grande da Serra', neighborhood: '', state: 'SP' },
  // ── Guarulhos ───────────────────────────────────────────────────────────────
  ...['Guarulhos','Gopouva','Jardim Bom Clima','Centro de Guarulhos','Pimentas',
      'Vila Galvão','Jardim Tranquilidade'].map(n =>
    ({ label: `${n !== 'Guarulhos' ? n + ', ' : ''}Guarulhos – SP`, city: 'Guarulhos', neighborhood: n === 'Guarulhos' ? '' : n, state: 'SP' })),
  // ── Osasco e região Oeste ───────────────────────────────────────────────────
  ...['Osasco','Barueri','Alphaville','Santana de Parnaíba','Carapicuíba',
      'Itapevi','Jandira','Cotia','Granja Viana'].map(n =>
    ({ label: `${n} – SP`, city: n, neighborhood: '', state: 'SP' })),
  // ── Sul e Sudoeste ──────────────────────────────────────────────────────────
  ...['Taboão da Serra','Embu das Artes','Embu-Guaçu','Itapecerica da Serra',
      'São Lourenço da Serra','Juquitiba'].map(n =>
    ({ label: `${n} – SP`, city: n, neighborhood: '', state: 'SP' })),
  // ── Norte ───────────────────────────────────────────────────────────────────
  ...['Mairiporã','Caieiras','Franco da Rocha','Francisco Morato','Cajamar',
      'Pirapora do Bom Jesus'].map(n =>
    ({ label: `${n} – SP`, city: n, neighborhood: '', state: 'SP' })),
  // ── Leste / Alto Tietê ─────────────────────────────────────────────────────
  ...['Mogi das Cruzes','Suzano','Poá','Itaquaquecetuba','Ferraz de Vasconcelos',
      'Guararema','Salesópolis','Biritiba-Mirim'].map(n =>
    ({ label: `${n} – SP`, city: n, neighborhood: '', state: 'SP' })),
];

export async function GET() {
  try {
    // Retorna cache se válido
    if (_bairrosCache.data.length > 0 && Date.now() < _bairrosCache.expiresAt) {
      return NextResponse.json({ locations: _bairrosCache.data, source: 'cache' });
    }

    // Mock mode — retorna estático
    if (process.env.USE_MOCK === 'true') {
      return NextResponse.json({ locations: RMSP_STATIC, source: 'static' });
    }

    const token = await getToken();

    // Busca primeiros 200 empreendimentos do estado SP para extrair cidades/bairros reais
    const qs = new URLSearchParams({ state: 'SP', per_page: '200', page: '1' });
    const resp = await fetch(`${ORULO_BASE}/api/v2/buildings?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resp.ok) throw new Error(`Orulo ${resp.status}`);
    const raw = await resp.json();
    const list = (raw.buildings ?? raw.data ?? raw.results ?? []) as Record<string, unknown>[];

    // Extrai cidades e bairros únicos
    const seen = new Set<string>();
    const fromApi: LocationSuggestion[] = [];

    for (const b of list) {
      const addr = (b.address as Record<string, string>) || {};
      const city = (addr.city || '').trim();
      const neighborhood = (addr.area || addr.neighborhood || '').trim();
      const state = (addr.state || 'SP').trim();

      if (city) {
        const cityKey = `${city}|${state}`;
        if (!seen.has(cityKey)) {
          seen.add(cityKey);
          fromApi.push({ label: `${city} – ${state}`, city, neighborhood: '', state });
        }
        if (neighborhood) {
          const nbKey = `${neighborhood}|${city}`;
          if (!seen.has(nbKey)) {
            seen.add(nbKey);
            fromApi.push({
              label: `${neighborhood}, ${city} – ${state}`,
              city, neighborhood, state,
            });
          }
        }
      }
    }

    // Merge: API first, then static fill any gaps
    const apiCities = new Set(fromApi.map(l => l.city.toLowerCase()));
    const staticOnly = RMSP_STATIC.filter(l => !apiCities.has(l.city.toLowerCase()));
    const merged = [...fromApi, ...staticOnly].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

    _bairrosCache = { data: merged, expiresAt: Date.now() + 6 * 60 * 60 * 1000 };

    return NextResponse.json({ locations: merged, source: 'orulo+static' });

  } catch (err) {
    console.error('[api/orulo/bairros]', err);
    // Fallback para lista estática
    return NextResponse.json({ locations: RMSP_STATIC, source: 'static' });
  }
}
