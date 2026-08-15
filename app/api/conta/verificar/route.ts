/**
 * GET /api/conta/verificar?token=... — link clicado no e-mail de acesso.
 * Troca o token de uso único por uma sessão e redireciona pra /conta.
 */

import { NextRequest, NextResponse } from 'next/server';
import { trocarTokenPorSessao } from '@/lib/conta-kv';

export const COOKIE_NAME = 'fc_conta';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/conta?erro=1', req.url));
  }

  const sessionToken = await trocarTokenPorSessao(token);
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/conta?erro=1', req.url));
  }

  const res = NextResponse.redirect(new URL('/conta?bemvindo=1', req.url));
  res.cookies.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  });
  return res;
}
