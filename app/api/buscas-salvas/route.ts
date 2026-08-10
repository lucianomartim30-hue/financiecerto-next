/**
 * GET  /api/buscas-salvas — lista todas as buscas salvas (protegido, painel admin).
 * POST /api/buscas-salvas — cria uma busca salva (chamado publicamente pelo
 *                           formulário "Salvar esta busca" em /imoveis).
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvGetBuscasSalvas, kvAddBuscaSalva } from '@/lib/buscas-salvas-kv';
import { sessionToken } from '../admin-auth/route';

const COOKIE_NAME = 'admin_leads_session';

function isAuthed(req: NextRequest): boolean {
  const configured = process.env.ADMIN_LEADS_PASSWORD;
  if (!configured) return false;
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  return cookie === sessionToken(configured);
}

// Aceita telefone BR (com/sem DDI, 10-11 dígitos) ou e-mail simples.
function isContatoValido(contato: string): boolean {
  const digits = contato.replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 13) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato.trim());
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const buscas = await kvGetBuscasSalvas();
  return NextResponse.json({ buscas });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contato, descricaoFiltros, filtrosQuery, consentimento } = body ?? {};

    if (!contato || typeof contato !== 'string' || !isContatoValido(contato)) {
      return NextResponse.json({ error: 'Informe um telefone ou e-mail válido.' }, { status: 400 });
    }
    if (!consentimento) {
      return NextResponse.json({ error: 'É necessário aceitar o uso do contato.' }, { status: 400 });
    }

    const busca = await kvAddBuscaSalva({
      contato: String(contato).trim(),
      descricaoFiltros: String(descricaoFiltros || 'Todos os imóveis'),
      filtrosQuery: String(filtrosQuery || ''),
    });

    if (!busca) {
      return NextResponse.json({ error: 'Não foi possível salvar agora. Tente novamente.' }, { status: 503 });
    }

    return NextResponse.json({ ok: true, busca });
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar busca.' }, { status: 500 });
  }
}
