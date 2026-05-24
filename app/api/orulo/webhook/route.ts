/**
 * POST /api/orulo/webhook
 *
 * Recebe notificações da Orulo sobre mudanças no catálogo.
 *
 * Eventos (properties.status):
 *  active                    → empreendimento criado/atualizado
 *  removed                   → empreendimento vendido/sem estoque
 *  added_to_distribution     → entrou na distribuição desta integração
 *  excluded_from_distribution → saiu da distribuição desta integração
 *
 * Verificação de assinatura HMAC-SHA256 (quando ORULO_WEBHOOK_SECRET configurado):
 *  Header X-Orulo-Signature: v1=<hex>
 *  Header X-Orulo-Timestamp: unix timestamp (segundos)
 *  Rejeitar se |now - timestamp| > 300 segundos (proteção anti-replay)
 *  Calcular: HMAC-SHA256(secret, "{timestamp}.{raw_body}")
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getToken, fetchBuildingDetail, reportPublicationLink, SITE_BASE } from '@/lib/orulo-api';
import { kvUpsertBuilding, kvRemoveBuilding } from '@/lib/orulo-kv';

// ── Verificação de assinatura ─────────────────────────────────────────────────

function verifySignature(
  rawBody:   string,
  timestamp: string,
  signature: string,
  secret:    string,
): boolean {
  try {
    if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(`v1=${expected}`),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verificação HMAC (opcional — apenas se ORULO_WEBHOOK_SECRET estiver configurado)
  const webhookSecret = process.env.ORULO_WEBHOOK_SECRET ?? '';
  if (webhookSecret) {
    const signature = req.headers.get('x-orulo-signature') ?? '';
    const timestamp = req.headers.get('x-orulo-timestamp') ?? '';
    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Assinatura ausente' }, { status: 401 });
    }
    if (!verifySignature(rawBody, timestamp, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
    }
  }

  // Parse do payload
  let payload: {
    date:       string;
    name:       string;
    properties: {
      building_id: number;
      status:      string;
      client_id?:  string;
    };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });
  }

  const { building_id, status } = payload?.properties ?? {};

  if (!building_id || !status) {
    return NextResponse.json({ error: 'Payload incompleto' }, { status: 400 });
  }

  const eventId = req.headers.get('x-orulo-event-id') ?? 'unknown';
  console.log(`[webhook] event=${eventId} building=${building_id} status=${status}`);

  try {
    // ── active / added_to_distribution ───────────────────────────────────────
    if (status === 'active' || status === 'added_to_distribution') {
      const token    = await getToken();
      const building = await fetchBuildingDetail(token, building_id);

      if (building) {
        // Atualiza no cache KV
        await kvUpsertBuilding(building);

        // Reporta link de publicação (exigência Orulo)
        await reportPublicationLink(
          token,
          building.id,
          `${SITE_BASE}/imoveis/${building.id}`,
          true,
        );

        console.log(`[webhook] upserted building ${building_id}`);
      } else {
        console.warn(`[webhook] building ${building_id} não encontrado na API`);
      }
    }

    // ── removed ──────────────────────────────────────────────────────────────
    else if (status === 'removed') {
      await kvRemoveBuilding(String(building_id));
      console.log(`[webhook] removed building ${building_id}`);
    }

    // ── excluded_from_distribution ────────────────────────────────────────────
    else if (status === 'excluded_from_distribution') {
      // Hard delete do empreendimento nesta integração
      await kvRemoveBuilding(String(building_id));

      // Informa Orulo que não estamos mais publicando o imóvel
      try {
        const token = await getToken();
        await reportPublicationLink(
          token,
          String(building_id),
          `${SITE_BASE}/imoveis/${building_id}`,
          false, // active = false → despublicado
        );
      } catch {}

      console.log(`[webhook] excluded_from_distribution building ${building_id}`);
    }

    // A Orulo espera HTTP 200 para confirmar recebimento
    return NextResponse.json({ ok: true, building_id, status, event_id: eventId });

  } catch (err) {
    console.error('[webhook] erro ao processar:', String(err));
    // Retorna 200 mesmo em erro interno para evitar reenvios em loop pela Orulo
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
