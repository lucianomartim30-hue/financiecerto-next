/**
 * GET  /api/admin/promocoes?buildingId=X — lista promoções (inclusive vencidas) de um empreendimento.
 * POST /api/admin/promocoes — adiciona uma promoção.
 * PUT  /api/admin/promocoes — substitui TODAS as promoções do empreendimento por uma lista nova
 *      (colar e salvar de uma vez — ver "Substituir em lote" em /admin/promocoes).
 * DELETE /api/admin/promocoes — remove uma promoção.
 * Protegido pela mesma senha do /admin/leads e /admin/fotos.
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvGetPromocoesAdmin, kvAdicionarPromocao, kvRemoverPromocao, kvSubstituirPromocoes, type Promocao } from '@/lib/promocoes-kv';
import { sessionToken } from '../../admin-auth/route';

function normalizarItem(body: Record<string, unknown>): Omit<Promocao, 'id' | 'criadoEm'> | null {
  const { unidade, tipo, areaM2, quartos, vagas, andar, precoOriginal, precoPromocional, ultimaUnidade, investidorSCP, beneficio, validoAte, observacao } = body ?? {};
  if (typeof precoPromocional !== 'number' || precoPromocional <= 0) return null;
  return {
    unidade:       unidade ? String(unidade) : undefined,
    tipo:          tipo ? String(tipo) : undefined,
    areaM2:        typeof areaM2 === 'number' ? areaM2 : undefined,
    quartos:       typeof quartos === 'number' ? quartos : undefined,
    vagas:         typeof vagas === 'number' ? vagas : undefined,
    andar:         andar ? String(andar) : undefined,
    precoOriginal: typeof precoOriginal === 'number' && precoOriginal > 0 ? precoOriginal : undefined,
    precoPromocional,
    ultimaUnidade: ultimaUnidade === true ? true : undefined,
    investidorSCP: investidorSCP === true ? true : undefined,
    beneficio:     beneficio ? String(beneficio) : undefined,
    validoAte:     validoAte ? String(validoAte) : undefined,
    observacao:    observacao ? String(observacao) : undefined,
  };
}

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
  const { buildingId } = body ?? {};
  const item = normalizarItem(body);

  if (!buildingId || !item) {
    return NextResponse.json({ error: 'Dados incompletos — buildingId e precoPromocional são obrigatórios.' }, { status: 400 });
  }

  const promocao = await kvAdicionarPromocao(String(buildingId), item);
  return NextResponse.json({ ok: true, promocao });
}

export async function PUT(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { buildingId, promocoes } = body ?? {};

  if (!buildingId || !Array.isArray(promocoes)) {
    return NextResponse.json({ error: 'Dados incompletos — buildingId e promocoes (array) são obrigatórios.' }, { status: 400 });
  }

  const itens = promocoes.map(normalizarItem);
  const invalido = itens.findIndex(i => i === null);
  if (invalido !== -1) {
    return NextResponse.json({ error: `Item ${invalido + 1} inválido — precoPromocional é obrigatório e deve ser número > 0.` }, { status: 400 });
  }

  const novas = await kvSubstituirPromocoes(String(buildingId), itens as Exclude<typeof itens[number], null>[]);
  return NextResponse.json({ ok: true, promocoes: novas });
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
