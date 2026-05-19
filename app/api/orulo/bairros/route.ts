import { NextResponse } from 'next/server';

const ORULO_BASE = 'https://www.orulo.com.br';

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
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }).toString(),
  });
  if (!resp.ok) throw new Error(`Token error ${resp.status}`);
  const data = await resp.json();
  if (!data.access_token) throw new Error('Token nao retornado.');
  _tokenCache = { token: data.access_token, expiresAt: now + 20 * 60 * 60 * 1000 };
  return data.access_token;
}

function extractNeighborhood(address: Record<string, unknown>): string {
  return (
    (address.area         as string) ||
    (address.neighborhood as string) ||
    (address.neighbourhood as string) ||
    (address.district      as string) ||
    (address.region        as string) ||
    ''
  );
}

// Busca UMA página da cidade
async function fetchPage(token: string, city: string, page: number) {
  try {
    const qs = new URLSearchParams({ state: 'SP', city, per_page: '200', page: String(page) });
    const resp = await fetch(`${ORULO_BASE}/api/v2/buildings?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return [];
    const raw = await resp.json();
    return (raw.buildings ?? raw.data ?? raw.results ?? []) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

// Cache simples em memória (warm por instância Vercel — se reiniciar, rebusca)
let _cache: { locations: { label: string; city: string; neighborhood: string }[]; at: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 min

export async function GET() {
  try {
    // Serve do cache se ainda válido
    if (_cache && Date.now() - _cache.at < CACHE_TTL) {
      return NextResponse.json({ locations: _cache.locations, cached: true });
    }

    const token = await getToken();

    // Busca 3 páginas de SP (600 imóveis) em paralelo — ~1-2 s
    const [pg1, pg2, pg3] = await Promise.all([
      fetchPage(token, 'São Paulo', 1),
      fetchPage(token, 'São Paulo', 2),
      fetchPage(token, 'São Paulo', 3),
    ]);

    const all = [...pg1, ...pg2, ...pg3];

    // Contagem de bairros
    const nbCount: Record<string, number> = {};
    for (const b of all) {
      const addr = (b.address as Record<string, unknown>) || {};
      const nb   = extractNeighborhood(addr);
      if (nb) nbCount[nb] = (nbCount[nb] || 0) + 1;
    }

    // Ordenar por frequência
    const sorted = Object.entries(nbCount)
      .sort((a, b) => b[1] - a[1])
      .map(([nb]) => nb);

    // Formatar para o autocomplete: "Bairro, São Paulo – SP"
    const locations = sorted.map(nb => ({
      label:        `${nb}, São Paulo – SP`,
      city:         'São Paulo',
      neighborhood: nb,
    }));

    _cache = { locations, at: Date.now() };

    return NextResponse.json({ locations, total: locations.length });
  } catch (err) {
    return NextResponse.json({ error: String(err), locations: [] }, { status: 500 });
  }
}
