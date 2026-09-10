/**
 * PATCH /api/buscas-salvas/[id] — cancela (revoga) um alerta pelo próprio id.
 *
 * Público de propósito: o id é um UUID não-adivinhável (mesmo padrão de um link
 * de descadastro) e a única ação possível é revogar — nunca reativar, nunca ler
 * dados de outra busca. Exigir login aqui seria pedir pra pessoa criar conta só
 * pra cancelar um alerta que ela mesma pediu, o que não faz sentido dado que o
 * cadastro original também não exigiu conta.
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvRevogarBuscaSalva } from '@/lib/buscas-salvas-kv';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Id inválido.' }, { status: 400 });
  }

  const busca = await kvRevogarBuscaSalva(id);
  if (!busca) {
    return NextResponse.json({ error: 'Alerta não encontrado.' }, { status: 404 });
  }
  // Nunca ecoa whatsapp/email de volta — a resposta só confirma o cancelamento.
  return NextResponse.json({ ok: true });
}
