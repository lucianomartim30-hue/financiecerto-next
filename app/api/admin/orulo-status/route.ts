/**
 * GET /api/admin/orulo-status — diz se a autorização oruloEndUserAuth está
 * ativa (ver lib/orulo-enduser-kv.ts) e desde quando, pro painel /admin/orulo.
 * Nunca expõe o token em si.
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvGetOruloEndUserToken } from '@/lib/orulo-enduser-kv';
import { sessionToken } from '../../admin-auth/route';

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
  const token = await kvGetOruloEndUserToken();
  return NextResponse.json({ conectado: !!token, obtidoEm: token?.obtidoEm ?? null });
}
