/**
 * /api/favoritos
 * POST espelha no servidor a lista de favoritos do localStorage
 * (fire-and-forget, chamado a cada mudança). Salva por conta (e-mail) se a
 * pessoa está logada, senão por aparelho (fc_vid) — favoritar continua nunca
 * exigindo login, é só o registro que muda de dono.
 * GET devolve os favoritos já salvos pra esse dono — usado por
 * components/FavoritosSync.tsx pra restaurar no localStorage de um aparelho
 * novo (ou depois de limpar dados) quando a pessoa está logada: sem isso, o
 * espelho no servidor era só de escrita, e o "favoritos aparecem em qualquer
 * aparelho" prometido em /conta na prática nunca acontecia fora daquela
 * página (bug real, achado em 2026-09-01).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEmailDaSessao } from '@/lib/conta-kv';
import { kvSalvarFavoritos, kvGetFavoritos } from '@/lib/favoritos-kv';
import { kvRegistrarEvento } from '@/lib/rastreio-kv';

export async function GET(req: NextRequest) {
  const visitorId = req.cookies.get('fc_vid')?.value;
  const email = await getEmailDaSessao(req.cookies.get('fc_conta')?.value);
  const owner = email ? `e:${email}` : (visitorId ? `v:${visitorId}` : null);
  if (!owner) return NextResponse.json({ ids: [] });

  const ids = await kvGetFavoritos(owner);
  return NextResponse.json({ ids });
}

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json().catch(() => ({ ids: null }));
    if (!Array.isArray(ids)) return NextResponse.json({ ok: false }, { status: 200 });
    const idsValidos = ids.filter((x): x is string => typeof x === 'string');

    const visitorId = req.cookies.get('fc_vid')?.value;
    const email = await getEmailDaSessao(req.cookies.get('fc_conta')?.value);
    const owner = email ? `e:${email}` : (visitorId ? `v:${visitorId}` : null);
    if (!owner) return NextResponse.json({ ok: false }, { status: 200 });

    await kvSalvarFavoritos(owner, idsValidos);

    // Sinal de "favoritou" no rastreio anônimo — não bloqueia a resposta
    // nem depende dela dar certo (ver lib/rastreio-kv.ts).
    if (visitorId) kvRegistrarEvento(visitorId, { tipo: 'favorito', favoritosIds: idsValidos }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
