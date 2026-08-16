/**
 * GET /api/admin/refresh-building?id=X — busca um único empreendimento
 * fresco na Orulo e atualiza só ele no catálogo em cache (KV), sem precisar
 * de uma sincronização completa. Usado depois de mudanças em normalizeBuilding
 * (ex: excluir foto de marketing do card) que só afetam builds futuros do
 * cache — sem isso, o card continua mostrando o dado antigo até o próximo
 * sync completo.
 *
 * Sem senha de propósito: só busca dados reais direto da Orulo (nunca aceita
 * dado arbitrário do chamador) e escreve exatamente o que a Orulo responder —
 * não é uma superfície de injeção. Rate limit evita abuso/custo de API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken, fetchBuildingDetail } from '@/lib/orulo-api';
import { kvUpsertBuilding } from '@/lib/orulo-kv';

const rateMap = new Map<string, { count: number; resetAt: number }>();
function checkRate(ip: string) {
  const now = Date.now();
  const ent = rateMap.get(ip);
  if (!ent || now > ent.resetAt) { rateMap.set(ip, { count: 1, resetAt: now + 60_000 }); return true; }
  if (ent.count >= 5) return false;
  ent.count++;
  return true;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRate(ip)) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde 1 minuto.' }, { status: 429 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Informe ?id=' }, { status: 400 });
  }

  try {
    const token = await getToken();
    const building = await fetchBuildingDetail(token, id);
    if (!building) {
      return NextResponse.json({ error: 'Empreendimento não encontrado na Orulo.' }, { status: 404 });
    }
    await kvUpsertBuilding(building);
    return NextResponse.json({ ok: true, building });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
