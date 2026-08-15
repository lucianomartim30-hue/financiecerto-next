/**
 * POST /api/visita — chamado a cada página de imóvel vista (fire-and-forget,
 * sem autenticação). Só grava algo se o cookie fc_vid já é de um visitante
 * conhecido (identificado antes via lead — ver kvRegistrarVisita), pra não
 * inflar o KV com navegação anônima que nunca vira contato.
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvRegistrarVisita } from '@/lib/visitantes-kv';

export async function POST(req: NextRequest) {
  try {
    const visitorId = req.cookies.get('fc_vid')?.value;
    const { imovelId } = await req.json();
    if (visitorId && imovelId && typeof imovelId === 'string') {
      await kvRegistrarVisita(visitorId, imovelId);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
