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
      `${ORULO_BASE}/api/v2/buildings?state=SP&city=S%C3%A3o+Paulo&per_page=5&page=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!probe.ok)
      return NextResponse.json({ error: `Probe error ${probe.status}` }, { status: 500 });

    const probeData = await probe.json();
    const list = (probeData.buildings ?? probeData.data ?? probeData.results ?? []) as Record<string, unknown>[];

    const samples = list.slice(0, 3).map(b => ({
      id:               b.id,
      name:             b.name,
      top_level_keys:   Object.keys(b),
      // coords top-level
      latitude:         b.latitude,
      longitude:        b.longitude,
      lat:              b.lat,
      lng:              b.lng,
      // address
      address:          b.address,
      // coordinate objects
      coordinates:      b.coordinates,
      coordinate:       b.coordinate,
      location:         b.location,
      geo:              b.geo,
      position:         b.position,
      // delivery
      delivery_date:    b.delivery_date,
      expected_delivery: b.expected_delivery,
      completion_date:  b.completion_date,
      launch_date:      b.launch_date,
      updated_at:       b.updated_at,
    }));

    return NextResponse.json({
      total_count:     probeData.total_count ?? probeData.total ?? '?',
      total_pages:     probeData.total_pages ?? probeData.pages ?? '?',
      response_keys:   Object.keys(probeData),
      samples,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
