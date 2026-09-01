/**
 * POST /api/visita — chamado a cada página de imóvel vista (fire-and-forget,
 * sem autenticação). Se o fc_vid já é de um visitante identificado (virou
 * lead antes), grava no histórico permanente (lib/visitantes-kv.ts); senão,
 * grava no rastreio anônimo com expiração (lib/rastreio-kv.ts) — é o que
 * permite ver, no /admin/rastreio, quem viu imóvel mas nunca virou lead.
 * Também grava em lib/imoveis-vistos-kv.ts (por conta, permanente) — é o que
 * alimenta "imóveis que você viu" em /conta, funcionando em qualquer aparelho
 * depois de logada.
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvGetVisitante, kvRegistrarVisita } from '@/lib/visitantes-kv';
import { kvRegistrarEvento } from '@/lib/rastreio-kv';
import { kvRegistrarImovelVisto } from '@/lib/imoveis-vistos-kv';
import { getEmailDaSessao } from '@/lib/conta-kv';

export async function POST(req: NextRequest) {
  try {
    const visitorId = req.cookies.get('fc_vid')?.value;
    const { imovelId } = await req.json();
    if (visitorId && imovelId && typeof imovelId === 'string') {
      const conhecido = await kvGetVisitante(visitorId);
      if (conhecido) {
        await kvRegistrarVisita(visitorId, imovelId);
      } else {
        await kvRegistrarEvento(visitorId, { tipo: 'imovel', imovelId });
      }

      const email = await getEmailDaSessao(req.cookies.get('fc_conta')?.value);
      const owner = email ? `e:${email}` : `v:${visitorId}`;
      kvRegistrarImovelVisto(owner, imovelId).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
