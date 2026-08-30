/**
 * POST /api/rastreio — registra eventos de navegação sem conversão (fire-and-
 * forget, sem autenticação). Hoje só usado pra "abriu a listagem de imóveis"
 * (ver app/imoveis/page.tsx); visita a imóvel específico e simulação completa
 * têm seus próprios pontos de registro (/api/visita e /api/simulacoes) porque
 * já existiam ali. Ver lib/rastreio-kv.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvRegistrarEvento, type TipoEvento } from '@/lib/rastreio-kv';

const TIPOS_VALIDOS: TipoEvento[] = ['imovel', 'simulador', 'listagem'];

export async function POST(req: NextRequest) {
  try {
    const visitorId = req.cookies.get('fc_vid')?.value;
    const { tipo } = await req.json();
    if (visitorId && TIPOS_VALIDOS.includes(tipo)) {
      await kvRegistrarEvento(visitorId, { tipo });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
