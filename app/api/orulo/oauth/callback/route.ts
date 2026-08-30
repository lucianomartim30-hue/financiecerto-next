/**
 * GET /api/orulo/oauth/callback — segundo passo do fluxo oruloEndUserAuth
 * (ver /api/orulo/oauth/start e lib/orulo-enduser-kv.ts). A Órulo redireciona
 * pra cá com ?code=... depois que o corretor autoriza; troca esse código pelo
 * access token de usuário final e guarda (só o token — nunca o conteúdo das
 * campanhas, ver lib/orulo-enduser-kv.ts).
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvSalvarOruloEndUserToken } from '@/lib/orulo-enduser-kv';

const STATE_COOKIE = 'orulo_oauth_state';
const ORULO_BASE = 'https://www.orulo.com.br';
const REDIRECT_URI = 'https://www.financiecerto.com.br/api/orulo/oauth/callback';
const ADMIN_URL = 'https://www.financiecerto.com.br/admin/orulo';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const stateCookie = req.cookies.get(STATE_COOKIE)?.value;

  const falhar = (motivo: string) => {
    const url = new URL(ADMIN_URL);
    url.searchParams.set('erro', motivo);
    const res = NextResponse.redirect(url.toString());
    res.cookies.delete(STATE_COOKIE);
    return res;
  };

  if (!code) return falhar('sem_codigo');
  if (!state || !stateCookie || state !== stateCookie) return falhar('state_invalido');

  const clientId = process.env.ORULO_CLIENT_ID;
  const clientSecret = process.env.ORULO_CLIENT_SECRET;
  if (!clientId || !clientSecret) return falhar('credenciais_ausentes');

  try {
    const resp = await fetch(`${ORULO_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    });
    const data = await resp.json();
    if (!resp.ok || !data.access_token) {
      console.error('[orulo/oauth/callback] token exchange falhou', resp.status, data);
      return falhar('troca_de_token_falhou');
    }

    await kvSalvarOruloEndUserToken(data.access_token);

    const url = new URL(ADMIN_URL);
    url.searchParams.set('conectado', '1');
    const res = NextResponse.redirect(url.toString());
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (e) {
    console.error('[orulo/oauth/callback]', e);
    return falhar('erro_inesperado');
  }
}
