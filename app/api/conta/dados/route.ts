/**
 * GET /api/conta/dados — tudo que a conta já reúne: simulações feitas,
 * favoritos, alertas ativos e contatos, todos vinculados ao e-mail da sessão
 * (não ao aparelho — funciona igual em qualquer um). Não existe cadastro
 * separado de "conta": a conta é só o e-mail reconhecendo o que já foi feito.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEmailDaSessao } from '@/lib/conta-kv';
import { kvGetBuscasSalvas } from '@/lib/buscas-salvas-kv';
import { kvGetLeads } from '@/lib/leads-kv';
import { kvGetSimulacoes } from '@/lib/simulacoes-kv';
import { kvGetFavoritos } from '@/lib/favoritos-kv';

export async function GET(req: NextRequest) {
  const email = await getEmailDaSessao(req.cookies.get('fc_conta')?.value);
  if (!email) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const owner = `e:${email}`;
  const [buscas, leads, simulacoes, favoritoIds] = await Promise.all([
    kvGetBuscasSalvas(),
    kvGetLeads(),
    kvGetSimulacoes(owner),
    kvGetFavoritos(owner),
  ]);
  const alertas  = buscas.filter(b => b.ativa && b.email?.trim().toLowerCase() === email.toLowerCase());
  const contatos = leads.filter(l => l.contato?.email?.trim().toLowerCase() === email.toLowerCase());

  return NextResponse.json({ email, alertas, contatos, simulacoes, favoritoIds });
}
