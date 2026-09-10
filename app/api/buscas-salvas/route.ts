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

// Telefone BR (com/sem DDI, 10-11 dígitos).
function isWhatsappValido(whatsapp: string): boolean {
  const digits = whatsapp.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}
function isEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Espelha a regra do cliente (hasFilters em app/imoveis/page.tsx): salvar "todos os
// imóveis" sem nenhum filtro não faz sentido como alerta e nunca deveria ter sido
// oferecido no front — mas a validação real tem que estar aqui, não só na UI.
const CHAVES_FILTRO = ['q', 'neighborhood', 'min', 'max', 'bedrooms_min', 'status', 'tipo', 'tipologia'];
function temFiltroMinimo(filtrosQuery: string): boolean {
  const qs = (filtrosQuery || '').replace(/^\?/, '').trim();
  if (!qs) return false;
  const params = new URLSearchParams(qs);
  return CHAVES_FILTRO.some(k => !!params.get(k));
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
    const { whatsapp, email, descricaoFiltros, filtrosQuery, consentimento } = body ?? {};

    if (!whatsapp || typeof whatsapp !== 'string' || !isWhatsappValido(whatsapp)) {
      return NextResponse.json({ error: 'Informe um WhatsApp válido.' }, { status: 400 });
    }
    if (email && (typeof email !== 'string' || !isEmailValido(email))) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
    }
    if (!consentimento) {
      return NextResponse.json({ error: 'É necessário aceitar o uso do contato.' }, { status: 400 });
    }
    if (!temFiltroMinimo(String(filtrosQuery || ''))) {
      return NextResponse.json({ error: 'Aplique ao menos um filtro antes de ativar um alerta.' }, { status: 400 });
    }

    const busca = await kvAddBuscaSalva({
      whatsapp: String(whatsapp).trim(),
      email: email ? String(email).trim() : '',
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
