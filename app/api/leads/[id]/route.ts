/**
 * PATCH /api/leads/[id] — atualiza status/nota de um lead (protegido).
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvUpdateLead, kvDeleteLead, type LeadStatus } from '@/lib/leads-kv';
import { sessionToken } from '../../admin-auth/route';

const COOKIE_NAME = 'admin_leads_session';
const VALID_STATUS: LeadStatus[] = ['novo', 'conversando', 'visita', 'fechado', 'perdido'];

function isAuthed(req: NextRequest): boolean {
  const configured = process.env.ADMIN_LEADS_PASSWORD;
  if (!configured) return false;
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  return cookie === sessionToken(configured);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Partial<{ status: LeadStatus; nota: string }> = {};

  if (body.status !== undefined) {
    if (!VALID_STATUS.includes(body.status)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.nota !== undefined) {
    patch.nota = String(body.nota).slice(0, 2000);
  }

  const lead = await kvUpdateLead(id, patch);
  if (!lead) {
    return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, lead });
}

/** DELETE /api/leads/[id] — remove um lead (ex: registro de teste). Irreversível. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const { id } = await params;
  const ok = await kvDeleteLead(id);
  if (!ok) {
    return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
