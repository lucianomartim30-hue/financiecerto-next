/**
 * POST /api/simulacoes — grava automaticamente toda simulação concluída
 * (fire-and-forget, chamado pelo simulador ao chegar no resultado). Salva
 * por conta (e-mail) se a pessoa está logada, senão por aparelho (fc_vid) —
 * nunca exige login pra simular, é só o registro que muda de dono.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEmailDaSessao } from '@/lib/conta-kv';
import { kvSalvarSimulacao } from '@/lib/simulacoes-kv';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const valorImovel   = Number(body?.valorImovel);
    const parcelaPrice  = Number(body?.parcelaPrice);
    if (!body || !Number.isFinite(valorImovel) || !Number.isFinite(parcelaPrice)) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    const visitorId = req.cookies.get('fc_vid')?.value;
    const email = await getEmailDaSessao(req.cookies.get('fc_conta')?.value);
    const owner = email ? `e:${email}` : (visitorId ? `v:${visitorId}` : null);
    if (!owner) return NextResponse.json({ ok: false }, { status: 200 });

    await kvSalvarSimulacao(owner, {
      modalidade:       String(body.modalidade || ''),
      valorImovel,
      valorFinanciado:  Number(body.valorFinanciado) || 0,
      parcelaPrice,
      parcelaSAC:       Number(body.parcelaSAC) || 0,
      taxaAnual:        Number(body.taxaAnual) || 0,
      prazoAnos:        Number(body.prazoAnos) || 0,
      comprometimento:  Number(body.comprometimento) || 0,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
