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

export async function GET() {
  try {
    const clientId     = process.env.ORULO_CLIENT_ID;
    const clientSecret = process.env.ORULO_CLIENT_SECRET;
    if (!clientId || !clientSecret)
      return NextResponse.json({ error: 'Credenciais nao configuradas.' }, { status: 500 });

    const token = await getToken(clientId, clientSecret);

    // ── Página 1 com per_page=5 para ver estrutura + totais ──────────────────
    const resp1 = await fetch(
      `${ORULO_BASE}/api/v2/buildings?state=SP&city=S%C3%A3o%20Paulo&per_page=5&page=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data1 = await resp1.json();
    const list1 = (data1.buildings ?? data1.data ?? data1.results ?? []) as Record<string, unknown>[];

    // ── per_page=200 página 1 ─────────────────────────────────────────────────
    const resp2 = await fetch(
      `${ORULO_BASE}/api/v2/buildings?state=SP&city=S%C3%A3o%20Paulo&per_page=200&page=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data2 = await resp2.json();
    const list2 = (data2.buildings ?? data2.data ?? data2.results ?? []) as Record<string, unknown>[];

    // ── per_page=200 página 2 (existe mais?) ──────────────────────────────────
    const resp3 = await fetch(
      `${ORULO_BASE}/api/v2/buildings?state=SP&city=S%C3%A3o%20Paulo&per_page=200&page=2`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data3 = await resp3.json();
    const list3 = (data3.buildings ?? data3.data ?? data3.results ?? []) as Record<string, unknown>[];

    const sample  = list1[0] ?? {};
    const address = (sample.address as Record<string, unknown>) ?? {};

    // Análise de preço dos primeiros 10 imóveis (identifica campo correto)
    const priceAnalysis = list2.slice(0, 10).map((b: Record<string, unknown>) => ({
      id:           b.id,
      name:         b.name,
      min_price:    b.min_price,
      max_price:    b.max_price,
      price:        b.price,
      prices:       b.prices,
      price_from:   b.price_from,
      starting:     b.starting_price ?? b.start_price,
    }));

    return NextResponse.json({
      token_ok: true,
      api_totals: {
        total_count: data1.total_count ?? data1.total ?? (data1.meta as Record<string,unknown>)?.total ?? '?',
        total_pages: data1.total_pages ?? data1.pages ?? (data1.meta as Record<string,unknown>)?.total_pages ?? '?',
        top_keys:    Object.keys(data1),
      },
      counts: {
        page1_per5:   list1.length,
        page1_per200: list2.length,
        page2_per200: list3.length,
      },
      building_top_keys: Object.keys(sample),
      address_keys:      Object.keys(address),
      price_analysis:    priceAnalysis,
      status_sample: list2.slice(0, 5).map((b: Record<string, unknown>) => ({
        id:       b.id,
        stage:    b.stage,
        status:   b.status,
        finality: b.finality,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
