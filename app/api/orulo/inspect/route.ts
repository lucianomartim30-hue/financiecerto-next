import { NextResponse } from 'next/server';

const ORULO_BASE = 'https://www.orulo.com.br';

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  const resp = await fetch(`${ORULO_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }).toString(),
  });
  if (!resp.ok) throw new Error(`Token error ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  if (!data.access_token) throw new Error(`Token vazio: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function probe(url: string, token: string) {
  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(12000),
    });
    const raw  = await resp.json();
    const list = (raw.buildings ?? raw.data ?? raw.results ?? []) as Record<string, unknown>[];
    return {
      http:        resp.status,
      total_count: raw.total_count ?? raw.total ?? raw.meta?.total ?? '?',
      total_pages: raw.total_pages ?? raw.pages ?? raw.meta?.total_pages ?? '?',
      returned:    list.length,
      top_keys:    Object.keys(raw),
      sample_id:   list[0]?.id ?? null,
    };
  } catch (e) {
    return { http: 0, error: String(e) };
  }
}

export async function GET() {
  try {
    const clientId     = process.env.ORULO_CLIENT_ID;
    const clientSecret = process.env.ORULO_CLIENT_SECRET;
    if (!clientId || !clientSecret)
      return NextResponse.json({ error: 'Credenciais nao configuradas.' }, { status: 500 });

    const token = await getToken(clientId, clientSecret);

    // Serie A: com city=Sao Paulo, varios per_page e paginas
    const [a1, a2, a3, a4, a5] = await Promise.all([
      probe(`${ORULO_BASE}/api/v2/buildings?state=SP&city=S%C3%A3o%20Paulo&per_page=5&page=1`,   token),
      probe(`${ORULO_BASE}/api/v2/buildings?state=SP&city=S%C3%A3o%20Paulo&per_page=200&page=1`, token),
      probe(`${ORULO_BASE}/api/v2/buildings?state=SP&city=S%C3%A3o%20Paulo&per_page=200&page=2`, token),
      probe(`${ORULO_BASE}/api/v2/buildings?state=SP&city=S%C3%A3o%20Paulo&per_page=200&page=3`, token),
      probe(`${ORULO_BASE}/api/v2/buildings?state=SP&city=S%C3%A3o%20Paulo&per_page=100&page=1`, token),
    ]);

    // Serie B: so state=SP, sem city
    const [b1, b2] = await Promise.all([
      probe(`${ORULO_BASE}/api/v2/buildings?state=SP&per_page=200&page=1`, token),
      probe(`${ORULO_BASE}/api/v2/buildings?state=SP&per_page=200&page=2`, token),
    ]);

    // Serie C: sem nenhum filtro
    const c1 = await probe(`${ORULO_BASE}/api/v2/buildings?per_page=200&page=1`, token);

    // Detalhes do 1o imovel
    const detailResp = await fetch(
      `${ORULO_BASE}/api/v2/buildings?state=SP&city=S%C3%A3o%20Paulo&per_page=5&page=1`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) },
    );
    const detailRaw  = await detailResp.json();
    const detailList = (detailRaw.buildings ?? detailRaw.data ?? detailRaw.results ?? []) as Record<string, unknown>[];
    const sample     = detailList[0] ?? {};
    const address    = (sample.address as Record<string, unknown>) ?? {};

    const priceAnalysis = detailList.slice(0, 5).map((b: Record<string, unknown>) => ({
      id:        b.id,
      name:      b.name,
      min_price: b.min_price,
      max_price: b.max_price,
      price:     b.price,
      stage:     b.stage,
      status:    b.status,
    }));

    const apiTotal = Number(a1.total_count);

    return NextResponse.json({
      token_ok: true,

      city_filter: {
        per5_p1:   a1,
        per200_p1: a2,
        per200_p2: a3,
        per200_p3: a4,
        per100_p1: a5,
      },

      state_only: {
        per200_p1: b1,
        per200_p2: b2,
      },

      no_filter: {
        per200_p1: c1,
      },

      building_keys:  Object.keys(sample),
      address_keys:   Object.keys(address),
      price_analysis: priceAnalysis,

      diagnosis: {
        api_total:     a1.total_count,
        api_pages:     a1.total_pages,
        p1_returned:   a2.returned,
        p2_returned:   a3.returned,
        p3_returned:   a4.returned,
        state_only_p1: b1.returned,
        no_filter_p1:  c1.returned,
        conclusion:
          apiTotal > 0 && apiTotal < 200
            ? 'CATALOGO LIMITADO: API so tem ' + apiTotal + ' imoveis para essas credenciais.'
            : apiTotal >= 200
              ? 'API tem ' + apiTotal + ' imoveis — verificar paginacao e filtros.'
              : 'Nao foi possivel determinar total_count.',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
