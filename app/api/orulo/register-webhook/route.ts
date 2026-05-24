/**
 * GET /api/orulo/register-webhook?secret=xxx
 *
 * Registra o endpoint /api/orulo/webhook na plataforma Orulo para que
 * qualquer mudança no catálogo (novo imóvel, atualização, remoção) seja
 * enviada automaticamente ao site — sem precisar rodar o sync manualmente.
 *
 * Deve ser chamado UMA VEZ após o deploy. Após isso, o webhook da Orulo
 * mantém o catálogo sincronizado em tempo real.
 *
 * A Orulo envia eventos para o endpoint quando:
 *  - Um imóvel é criado ou atualizado (status: active)
 *  - Um imóvel é removido/vendido (status: removed)
 *  - Um imóvel entra na distribuição (status: added_to_distribution)
 *  - Um imóvel sai da distribuição (status: excluded_from_distribution)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken, SITE_BASE } from '@/lib/orulo-api';

const ORULO_BASE     = 'https://www.orulo.com.br';
const WEBHOOK_PATH   = '/api/orulo/webhook';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const providedSecret   = searchParams.get('secret') ?? '';

  const syncSecret = process.env.ORULO_SYNC_SECRET ?? '';
  if (syncSecret && providedSecret !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const webhookUrl = `${SITE_BASE}${WEBHOOK_PATH}`;

  try {
    const token = await getToken();

    // ── Tenta listar subscrições existentes ────────────────────────────────────
    const listResp = await fetch(`${ORULO_BASE}/api/v2/subscriptions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listData = listResp.ok ? await listResp.json() : null;

    // ── Registra (ou atualiza) a subscrição ────────────────────────────────────
    // A Orulo aceita POST para criar e PUT para atualizar
    const body = JSON.stringify({
      subscription: {
        url:          webhookUrl,
        active:       true,
      },
    });

    // Tenta POST primeiro (criar)
    const postResp = await fetch(`${ORULO_BASE}/api/v2/subscriptions`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body,
    });
    const postData = postResp.ok ? await postResp.json() : null;

    // Se POST falhou (já existe), tenta PUT
    let putData = null;
    if (!postResp.ok) {
      const putResp = await fetch(`${ORULO_BASE}/api/v2/subscriptions`, {
        method:  'PUT',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
      });
      putData = putResp.ok ? await putResp.json() : {
        http_status: putResp.status,
        body: await putResp.text(),
      };
    }

    return NextResponse.json({
      webhook_url:      webhookUrl,
      existing:         listData,
      post_http:        postResp.status,
      post_result:      postData,
      put_result:       putData,
      instructions:     postResp.ok || putData
        ? 'Webhook registrado com sucesso. A Orulo enviará eventos automaticamente.'
        : 'Não foi possível registrar automaticamente. Cadastre manualmente o webhook na plataforma Orulo usando a URL acima.',
    });

  } catch (err) {
    return NextResponse.json({
      error:       String(err),
      webhook_url: webhookUrl,
      instructions: `Registre manualmente na Orulo: POST /api/v2/subscriptions com { "subscription": { "url": "${webhookUrl}", "active": true } }`,
    }, { status: 500 });
  }
}
