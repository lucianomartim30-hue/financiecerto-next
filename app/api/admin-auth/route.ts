/**
 * POST /api/admin-auth — login simples do painel /admin/leads.
 * Compara a senha enviada com ADMIN_LEADS_PASSWORD (env var) e, se bater,
 * grava um cookie httpOnly com um token derivado (não a senha em si).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

const COOKIE_NAME = 'admin_leads_session';

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
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
