/**
 * POST /api/admin-auth — login simples do painel /admin/leads.
 * Compara a senha enviada com ADMIN_LEADS_PASSWORD (env var) e, se bater,
 * grava um cookie httpOnly com um token derivado (não a senha em si).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

const COOKIE_NAME = 'admin_leads_session';
const COOKIE_INTERNO = 'fc_interno';

export function sessionToken(password: string): string {
  return createHash('sha256').update(`leads:${password}:financiecerto`).digest('hex');
}

export async function POST(req: NextRequest) {
  const configured = process.env.ADMIN_LEADS_PASSWORD;
  if (!configured) {
    return NextResponse.json({ error: 'Painel não configurado.' }, { status: 500 });
  }

  const { password } = await req.json().catch(() => ({ password: '' }));
  if (password !== configured) {
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, sessionToken(password), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
  marcarInterno(res);
  return res;
}

/**
 * Marca o navegador como "acesso interno" (dono do site). O script do GA em
 * app/layout.tsx lê esse cookie e desliga o envio ao Analytics — assim os
 * acessos do próprio dono não inflam os relatórios. Não é httpOnly de
 * propósito: precisa ser lido pelo script da página.
 */
function marcarInterno(res: NextResponse) {
  res.cookies.set(COOKIE_INTERNO, '1', {
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 ano
  });
}

/**
 * GET /api/admin-auth — renova a marca de acesso interno pra quem já está
 * logado (o cookie de sessão dura 30 dias, então o dono raramente passa pelo
 * POST). Chamado pelo layout do /admin a cada visita ao painel.
 */
export async function GET(req: NextRequest) {
  const configured = process.env.ADMIN_LEADS_PASSWORD;
  const logado = !!configured && req.cookies.get(COOKIE_NAME)?.value === sessionToken(configured);
  const res = NextResponse.json({ interno: logado });
  if (logado) marcarInterno(res);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
