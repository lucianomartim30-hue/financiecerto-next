/**
 * GET /api/conta/dados — alertas ativos e contatos feitos com o e-mail da
 * sessão logada. Não existe cadastro separado de "conta": a conta é só o
 * e-mail reconhecendo o que já foi pedido em buscas-salvas e leads.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEmailDaSessao } from '@/lib/conta-kv';
import { kvGetBuscasSalvas } from '@/lib/buscas-salvas-kv';
import { kvGetLeads } from '@/lib/leads-kv';

export async function GET(req: NextRequest) {
  const email = await getEmailDaSessao(req.cookies.get('fc_conta')?.value);
  if (!email) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const [buscas, leads] = await Promise.all([kvGetBuscasSalvas(), kvGetLeads()]);
  const alertas  = buscas.filter(b => b.ativa && b.email.trim().toLowerCase() === email.toLowerCase());
  const contatos = leads.filter(l => l.contato?.email?.trim().toLowerCase() === email.toLowerCase());

  return NextResponse.json({ email, alertas, contatos });
}
