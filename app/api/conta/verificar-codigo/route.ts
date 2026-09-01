/**
 * POST /api/conta/verificar-codigo — confere o código de 6 dígitos e, se
 * bater, abre a sessão (cookie httpOnly, 90 dias). Também "reivindica" pra
 * dentro da conta as simulações e favoritos feitos nesse mesmo aparelho
 * antes do login (ver kvReivindicarSimulacoes/Favoritos) — é o único momento
 * em que isso acontece; dali em diante tudo que a pessoa fizer logada já
 * grava direto na conta, funcionando em qualquer aparelho.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verificarCodigo } from '@/lib/conta-kv';
import { kvReivindicarSimulacoes } from '@/lib/simulacoes-kv';
import { kvReivindicarFavoritos } from '@/lib/favoritos-kv';
import { kvReivindicarImoveisVistos } from '@/lib/imoveis-vistos-kv';

const COOKIE_NAME = 'fc_conta';

const rateMap = new Map<string, { count: number; resetAt: number }>();
function checkRate(ip: string) {
  const now = Date.now();
  const ent = rateMap.get(ip);
  if (!ent || now > ent.resetAt) { rateMap.set(ip, { count: 1, resetAt: now + 60_000 }); return true; }
  if (ent.count >= 10) return false;
  ent.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRate(ip)) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde 1 minuto.' }, { status: 429 });
  }

  const { email, code } = await req.json().catch(() => ({ email: '', code: '' }));
  if (!email || typeof email !== 'string' || !code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Informe o código recebido por e-mail.' }, { status: 400 });
  }

  const emailNorm = email.trim().toLowerCase();
  const sessionToken = await verificarCodigo(emailNorm, code.trim());
  if (!sessionToken) {
    return NextResponse.json({ error: 'Código inválido ou expirado. Peça um novo.' }, { status: 401 });
  }

  const visitorId = req.cookies.get('fc_vid')?.value;
  await Promise.all([
    kvReivindicarSimulacoes(visitorId, emailNorm),
    kvReivindicarFavoritos(visitorId, emailNorm),
    kvReivindicarImoveisVistos(visitorId, emailNorm),
  ]);

  const res = NextResponse.json({ ok: true, email: emailNorm });
  res.cookies.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  });
  return res;
}
