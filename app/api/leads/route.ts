/**
 * GET  /api/leads — lista todos os leads (protegido por senha do painel).
 * POST /api/leads — cria um lead (chamado publicamente no clique do WhatsApp
 *                    na página do imóvel — sem autenticação, é só um registro).
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvGetLeads, kvAddLead, type LeadSimulacao, type LeadCenarioProposta } from '@/lib/leads-kv';
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
    const { imovelId, imovelName, bairro, cidade, preco, oruloUrl, simulacao, cenarioProposta, favoritosCount } = body ?? {};

    if (!imovelId || !imovelName) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    // Objetos opcionais — só repassa se vierem no formato esperado (evita
    // gravar lixo no KV vindo de um client desatualizado ou adulterado).
    const simulacaoValida: LeadSimulacao | null =
      simulacao && typeof simulacao === 'object' && typeof simulacao.modalidade === 'string'
        ? {
            modalidade:       String(simulacao.modalidade),
            faixa:            simulacao.faixa ? String(simulacao.faixa) : undefined,
            renda:            typeof simulacao.renda === 'number' ? simulacao.renda : undefined,
            parcela:          typeof simulacao.parcela === 'number' ? simulacao.parcela : undefined,
            comprometimento:  typeof simulacao.comprometimento === 'number' ? simulacao.comprometimento : undefined,
          }
        : null;

    const cenarioValido: LeadCenarioProposta | null =
      cenarioProposta && typeof cenarioProposta === 'object' && typeof cenarioProposta.valorImovel === 'number'
        ? {
            valorImovel: cenarioProposta.valorImovel,
            fgts:    Number(cenarioProposta.fgts)    || 0,
            ato:     Number(cenarioProposta.ato)     || 0,
            sinais:  Number(cenarioProposta.sinais)  || 0,
            mensais: Number(cenarioProposta.mensais) || 0,
            anuais:  Number(cenarioProposta.anuais)  || 0,
            chaves:  Number(cenarioProposta.chaves)  || 0,
          }
        : null;

    const lead = await kvAddLead({
      imovelId:   String(imovelId),
      imovelName: String(imovelName),
      bairro:     bairro ? String(bairro) : '',
      cidade:     cidade ? String(cidade) : '',
      preco:      typeof preco === 'number' ? preco : null,
      oruloUrl:   oruloUrl ? String(oruloUrl) : null,
      simulacao:       simulacaoValida,
      cenarioProposta: cenarioValido,
      favoritosCount:  typeof favoritosCount === 'number' ? favoritosCount : undefined,
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
