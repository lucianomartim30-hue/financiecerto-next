import { NextResponse } from 'next/server';

const ORULO_BASE = 'https://www.orulo.com.br';

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  const resp = await fetch(`${ORULO_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }).toString(),
  });
  if (!resp.ok) throw new Error(`Token error ${resp.status}`);
  const data = await resp.json();
  return data.access_token;
}

export async function GET() {
  try {
    const clientId     = process.env.ORULO_CLIENT_ID;
    const clientSecret = process.env.ORULO_CLIENT_SECRET;
    if (!clientId || !clientSecret)
      return NextResponse.json({ error: 'Credenciais nao configuradas.' }, { status: 500 });

    const token = await getToken(clientId, clientSecret);

    // Busca só 3 imóveis para analisar a estrutura raw
    const resp = await fetch(
      `${ORULO_BASE}/api/v2/buildings?state=SP&city=S%C3%A3o+Paulo&per_page=3&page=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!resp.ok)
      return NextResponse.json({ error: `API error ${resp.status}` }, { status: 500 });

    const data = await resp.json();
    const list = (data.buildings ?? data.data ?? data.results ?? []) as Record<string, unknown>[];

    // Retorna os primeiros 2 imóveis completos + análise de coordenadas
    const coordAnalysis = list.slice(0, 3).map((b: Record<string, unknown>) => {
      const address = (b.address as Record<string, unknown>) || {};
      return {
        id:            b.id,
        name:          b.name,
        // Campos de estágio/status — chave para o filtro
        stage:         b.stage,
        status:        b.status,
        finality:      b.finality,
        delivery_date: b.delivery_date,
        // Coordenadas
        address_lat:   address.latitude,
        address_lng:   address.longitude,
        neighborhood:  address.area || address.neighborhood,
        city:          address.city,
      };
    });

    return NextResponse.json({
      total_count:  data.total_count ?? data.total ?? '?',
      total_pages:  data.total_pages ?? data.pages ?? '?',
      response_top_keys: Object.keys(data),
      analysis: coordAnalysis,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
