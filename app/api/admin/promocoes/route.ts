/**
 * GET  /api/admin/promocoes?buildingId=X — lista promoções (inclusive vencidas) de um empreendimento.
 * POST /api/admin/promocoes — adiciona uma promoção.
 * DELETE /api/admin/promocoes — remove uma promoção.
 * Protegido pela mesma senha do /admin/leads e /admin/fotos.
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvGetPromocoesAdmin, kvAdicionarPromocao, kvRemoverPromocao } from '@/lib/promocoes-kv';
import { sessionToken } from '../../admin-auth/route';

const COOKIE_NAME = 'admin_leads_session';

function isAuthed(req: NextRequest): boolean {
  const configured = process.env.ADMIN_LEADS_PASSWORD;
  if (!configured) return false;
  return req.cookies.get(COOKIE_NAME)?.value === sessionToken(configured);
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const buildingId = req.nextUrl.searchParams.get('buildingId');
  if (!buildingId) {
    return NextResponse.json({ error: 'buildingId obrigatório.' }, { status: 400 });
  }
  const promocoes = await kvGetPromocoesAdmin(buildingId);
  return NextResponse.json({ promocoes });
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { buildingId, unidade, areaM2, quartos, vagas, andar, precoOriginal, precoPromocional, beneficio, validoAte, observacao } = body ?? {};

  if (!buildingId || typeof precoPromocional !== 'number' || precoPromocional <= 0) {
    return NextResponse.json({ error: 'Dados incompletos — buildingId e precoPromocional são obrigatórios.' }, { status: 400 });
  }

  const promocao = await kvAdicionarPromocao(String(buildingId), {
    unidade:       unidade ? String(unidade) : undefined,
    areaM2:        typeof areaM2 === 'number' ? areaM2 : undefined,
    quartos:       typeof quartos === 'number' ? quartos : undefined,
    vagas:         typeof vagas === 'number' ? vagas : undefined,
    andar:         andar ? String(andar) : undefined,
    precoOriginal: typeof precoOriginal === 'number' && precoOriginal > 0 ? precoOriginal : undefined,
    precoPromocional,
    beneficio:     beneficio ? String(beneficio) : undefined,
    validoAte:     validoAte ? String(validoAte) : undefined,
    observacao:    observacao ? String(observacao) : undefined,
  });

  return NextResponse.json({ ok: true, promocao });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const { buildingId, promocaoId } = await req.json().catch(() => ({}));
  if (!buildingId || !promocaoId) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
  }
  await kvRemoverPromocao(String(buildingId), String(promocaoId));
  return NextResponse.json({ ok: true });
}
