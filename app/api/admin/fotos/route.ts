/**
 * POST /api/admin/fotos — esconde ou reexibe uma foto específica de um
 * empreendimento (curadoria manual, ver lib/fotos-ocultas-kv.ts).
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvOcultarFoto, kvReexibirFoto } from '@/lib/fotos-ocultas-kv';
import { sessionToken } from '../../admin-auth/route';

const COOKIE_NAME = 'admin_leads_session';

function isAuthed(req: NextRequest): boolean {
  const configured = process.env.ADMIN_LEADS_PASSWORD;
  if (!configured) return false;
  return req.cookies.get(COOKIE_NAME)?.value === sessionToken(configured);
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { buildingId, photoId, oculta } = await req.json().catch(() => ({}));
  if (!buildingId || !photoId || typeof oculta !== 'boolean') {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
  }

  if (oculta) await kvOcultarFoto(String(buildingId), String(photoId));
  else await kvReexibirFoto(String(buildingId), String(photoId));

  return NextResponse.json({ ok: true });
}
