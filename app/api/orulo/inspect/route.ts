/**
 * GET /api/orulo/inspect
 *
 * Endpoint de diagnóstico — retorna os primeiros 3 imóveis da Orulo com todos
 * os campos brutos (sem normalização), para identificar o nome exato dos campos
 * de bairro, cidade, etc. que a API v2 retorna.
 *
 * Use: abra /api/orulo/inspect no navegador depois de fazer o deploy.
 * Remova este arquivo assim que souber os campos corretos.
 */
import { NextResponse } from 'next/server';

const ORULO_BASE = 'https://www.orulo.com.br';

export async function GET() {
  try {
    const clientId     = process.env.ORULO_CLIENT_ID;
    const clientSecret = process.env.ORULO_CLIENT_SECRET;
    if (!clientId || !clientSecret)
      return NextResponse.json({ error: 'Credenciais não configuradas.' }, { status: 500 });

    // Token
    const tokenResp = await fetch(`${ORULO_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }).toString(),
    });
    if (!tokenResp.ok)
      return NextResponse.json({ error: `Token error ${tokenResp.status}` }, { status: 500 });
    const { access_token } = await tokenResp.json();

    // Busca 3 imóveis brutos de São Paulo
    const buildResp = await fetch(
      `${ORULO_BASE}/api/v2/buildings?state=SP&city=S%C3%A3o+Paulo&per_page=3&page=1`,
      { headers: { Authorization: `Bearer ${access_token}` } },
    );
    if (!buildResp.ok)
      return NextResponse.json({ error: `Buildings error ${buildResp.status}` }, { status: 500 });

    const raw = await buildResp.json();
    const list = (raw.buildings ?? raw.data ?? raw.results ?? []) as Record<string, unknown>[];

    // Retorna os campos brutos + análise do objeto address
    const inspection = list.map((b, i) => ({
      index:   i,
      id:      b.id,
      name:    b.name,
      status:  b.status,
      // Campos de endereço — é aqui que mora o bairro
      address: b.address,
      // Outros campos de localização que podem existir no nível raiz
      neighborhood_root: b.neighborhood ?? b.neighbourhood ?? b.area ?? b.district ?? '(não encontrado)',
      // Imagem
      default_image_keys: b.default_image ? Object.keys(b.default_image as object) : [],
      // Todos os campos do objeto raiz (sem os objetos nested para não poluir)
      root_keys: Object.keys(b),
    }));

    return NextResponse.json({
      total_pages_available: raw.total_pages ?? raw.pages,
      total_count: raw.total_count ?? raw.total,
      inspection,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
