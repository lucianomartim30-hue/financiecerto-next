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

    const probe = await fetch(
      `${ORULO_BASE}/api/v2/buildings?state=SP&city=S%C3%A3o+Paulo&per_page=200&page=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!probe.ok)
      return NextResponse.json({ error: `Probe error ${probe.status}` }, { status: 500 });

    const probeData  = await probe.json();
    const totalPages = Math.min(probeData.total_pages ?? probeData.pages ?? 1, 15);
    const totalCount = probeData.total_count ?? probeData.total ?? '?';
    const firstList  = (probeData.buildings ?? probeData.data ?? probeData.results ?? []) as Record<string, unknown>[];

    const restPages = totalPages > 1
      ? await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            fetch(
              `${ORULO_BASE}/api/v2/buildings?state=SP&city=S%C3%A3o+Paulo&per_page=200&page=${i + 2}`,
              { headers: { Authorization: `Bearer ${token}` } },
            )
              .then(r => r.ok ? r.json() : { buildings: [] })
              .then(d => (d.buildings ?? d.data ?? d.results ?? []) as Record<string, unknown>[])
              .catch(() => [] as Record<string, unknown>[]),
          ),
        )
      : [];

    const allBuildings = [...firstList, ...restPages.flat()];

    const neighborhoodMap: Record<string, number> = {};
    let sample: Record<string, unknown> | null = null;

    for (const b of allBuildings) {
      const addr = (b.address as Record<string, unknown>) || {};
      if (!sample && Object.keys(addr).length > 0) sample = addr;
      const area = (addr.area as string) || (addr.neighborhood as string) || (addr.neighbourhood as string) || '';
      if (area) neighborhoodMap[area] = (neighborhoodMap[area] || 0) + 1;
    }

    const neighborhoods = Object.entries(neighborhoodMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      total_buildings_fetched: allBuildings.length,
      total_count_orulo:       totalCount,
      pages_fetched:           totalPages,
      address_fields:          sample ? Object.keys(sample) : [],
      address_sample:          sample,
      neighborhoods_found:     neighborhoods.length,
      neighborhoods,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
