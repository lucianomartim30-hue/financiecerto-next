/**
 * POST /api/favoritos — espelha no servidor a lista de favoritos do
 * localStorage (fire-and-forget, chamado a cada mudança). Salva por conta
 * (e-mail) se a pessoa está logada, senão por aparelho (fc_vid) — favoritar
 * continua nunca exigindo login, é só o registro que muda de dono.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEmailDaSessao } from '@/lib/conta-kv';
import { kvSalvarFavoritos } from '@/lib/favoritos-kv';

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json().catch(() => ({ ids: null }));
    if (!Array.isArray(ids)) return NextResponse.json({ ok: false }, { status: 200 });

    const visitorId = req.cookies.get('fc_vid')?.value;
    const email = await getEmailDaSessao(req.cookies.get('fc_conta')?.value);
    const owner = email ? `e:${email}` : (visitorId ? `v:${visitorId}` : null);
    if (!owner) return NextResponse.json({ ok: false }, { status: 200 });

    await kvSalvarFavoritos(owner, ids.filter((x): x is string => typeof x === 'string'));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
