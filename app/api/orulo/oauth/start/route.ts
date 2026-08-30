/**
 * GET /api/orulo/oauth/start — primeiro passo do fluxo oruloEndUserAuth
 * (ver lib/orulo-enduser-kv.ts). Só o admin logado pode iniciar; redireciona
 * pra tela de autorização da Órulo com um `state` aleatório (proteção contra
 * CSRF/injeção de código — ver callback), guardado num cookie curto.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { sessionToken } from '../../../admin-auth/route';

const ADMIN_COOKIE = 'admin_leads_session';
const STATE_COOKIE = 'orulo_oauth_state';
const ORULO_BASE = 'https://www.orulo.com.br';
const REDIRECT_URI = 'https://www.financiecerto.com.br/api/orulo/oauth/callback';

function isAdmin(req: NextRequest): boolean {
  const configured = process.env.ADMIN_LEADS_PASSWORD;
  if (!configured) return false;
  return req.cookies.get(ADMIN_COOKIE)?.value === sessionToken(configured);
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const clientId = process.env.ORULO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'ORULO_CLIENT_ID não configurado.' }, { status: 500 });
  }

  const state = randomUUID();
  const authorizeUrl = new URL(`${ORULO_BASE}/oauth/authorize`);
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('state', state);

  const res = NextResponse.redirect(authorizeUrl.toString());
  res.cookies.set(STATE_COOKIE, state, {
    maxAge: 60 * 10, // 10 min — só precisa sobreviver à ida e volta da autorização
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
  return res;
}
