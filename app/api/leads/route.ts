/**
 * GET  /api/leads — lista todos os leads (protegido por senha do painel).
 * POST /api/leads — cria um lead (chamado publicamente no clique do WhatsApp
 *                    na página do imóvel — sem autenticação, é só um registro).
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvGetLeads, kvAddLead } from '@/lib/leads-kv';
import { sessionToken } from '../admin-auth/route';

const COOKIE_NAME = 'admin_leads_session';

function isAuthed(req: NextRequest): boolean {
  const configured = process.env.ADMIN_LEADS_PASSWORD;
  if (!configured) return false;
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  return cookie === sessionToken(configured);
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const leads = await kvGetLeads();
  return NextResponse.json({ leads });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imovelId, imovelName, bairro, cidade, preco, oruloUrl } = body ?? {};

    if (!imovelId || !imovelName) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    const lead = await kvAddLead({
      imovelId:   String(imovelId),
      imovelName: String(imovelName),
      bairro:     bairro ? String(bairro) : '',
      cidade:     cidade ? String(cidade) : '',
      preco:      typeof preco === 'number' ? preco : null,
      oruloUrl:   oruloUrl ? String(oruloUrl) : null,
    });

    if (!lead) {
      // KV indisponível — não quebra a experiência do usuário no site
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    return NextResponse.json({ ok: true, lead });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
