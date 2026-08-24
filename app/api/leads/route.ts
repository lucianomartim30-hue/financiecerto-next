/**
 * GET  /api/leads — lista todos os leads (protegido por senha do painel).
 * POST /api/leads — cria um lead (chamado publicamente no clique do WhatsApp
 *                    na página do imóvel — sem autenticação, é só um registro).
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { kvGetLeads, kvAddLead, type LeadSimulacao, type LeadCenarioProposta, type LeadAtribuicao, type LeadConversao, type LeadContato } from '@/lib/leads-kv';
import { kvGetVisitante, kvIdentificarVisitante } from '@/lib/visitantes-kv';
import { sessionToken } from '../admin-auth/route';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const wrap = (body: string) => `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:20px;background:#f3f4f6;">${body}</body></html>`;

/**
 * Notifica o corretor por e-mail quando um lead vem do formulário de contato
 * (fora do estado de SP — sem clique de WhatsApp, esse formulário é o ÚNICO
 * jeito de saber que alguém pediu contato; sem isso, o lead ficava só
 * gravado no KV, visível apenas se alguém entrasse manualmente em
 * /admin/leads). Fire-and-forget — nunca deve travar a resposta ao usuário.
 */
async function notificarLeadFormulario(lead: { imovelId: string; imovelName: string; bairro: string; cidade: string; contato: LeadContato }) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) { console.error('RESEND_API_KEY não configurada — lead de formulário não notificado'); return; }
  const resend = new Resend(RESEND_API_KEY);
  const { nome, email, whatsapp } = lead.contato;
  const local = [lead.bairro, lead.cidade].filter(Boolean).join(' · ');
  const urlImovel = lead.imovelId && lead.imovelId !== 'simulacao-na-planta'
    ? `https://www.financiecerto.com.br/imoveis/${lead.imovelId}`
    : '';

  const htmlAdmin = wrap(`
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#2563eb;padding:24px 32px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">Novo lead — ${esc(lead.imovelName)}</h1>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:120px;">Nome</td><td style="padding:8px 0;font-weight:700;color:#111827;">${esc(nome)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">WhatsApp</td><td style="padding:8px 0;font-weight:700;"><a href="https://wa.me/55${esc(whatsapp)}" style="color:#16a34a;">${esc(whatsapp)} →</a></td></tr>
          ${email ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">E-mail</td><td style="padding:8px 0;font-weight:700;color:#2563eb;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Imóvel</td><td style="padding:8px 0;font-weight:700;color:#111827;">${esc(lead.imovelName)}</td></tr>
          ${local ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Local</td><td style="padding:8px 0;">${esc(local)}</td></tr>` : ''}
          ${urlImovel ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Link</td><td style="padding:8px 0;font-weight:700;"><a href="${urlImovel}" style="color:#2563eb;">${urlImovel} →</a></td></tr>` : ''}
        </table>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
        <p style="font-size:11px;color:#9ca3af;">Fora do estado de SP — sem clique de WhatsApp, esse formulário é o único jeito de saber que essa pessoa pediu contato. Veja também em /admin/leads.</p>
      </div>
    </div>
  `);

  const htmlLead = wrap(`
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#16a34a;padding:24px 32px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">Recebemos seus dados!</h1>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        <p style="font-size:15px;color:#111827;">Olá, <strong>${esc(nome)}</strong>!</p>
        <p style="font-size:14px;color:#374151;line-height:1.7;">
          Recebemos seu interesse em <strong>${esc(lead.imovelName)}</strong>${local ? ` (${esc(local)})` : ''} e vamos entrar em contato pelo WhatsApp em breve.
        </p>
        <p style="font-size:13px;color:#6b7280;">Atenciosamente,<br/><strong>Equipe FinancieCerto</strong><br/><a href="https://www.financiecerto.com.br" style="color:#2563eb;">financiecerto.com.br</a></p>
      </div>
    </div>
  `);

  try {
    await resend.emails.send({
      from:    'FinancieCerto <contato@financiecerto.com.br>',
      to:      ['contato@financiecerto.com.br'],
      subject: `[Lead] ${lead.imovelName} — ${nome}`,
      html:    htmlAdmin,
      replyTo: email || undefined,
    });
    if (email) {
      resend.emails.send({
        from:    'FinancieCerto <contato@financiecerto.com.br>',
        to:      [email],
        subject: 'Recebemos seus dados — FinancieCerto',
        html:    htmlLead,
      }).catch(() => {});
    }
  } catch (e) {
    console.error('[leads] notificarLeadFormulario', e);
  }
}

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

  // Enriquece cada lead com o histórico do visitante (fc_vid) — permite o
  // painel mostrar "visitante recorrente" e quais outros imóveis ele viu,
  // mesmo que a pessoa nunca tenha feito login.
  const cacheVisitantes = new Map<string, Awaited<ReturnType<typeof kvGetVisitante>>>();
  const leadsEnriquecidos = await Promise.all(leads.map(async lead => {
    if (!lead.visitorId) return lead;
    if (!cacheVisitantes.has(lead.visitorId)) {
      cacheVisitantes.set(lead.visitorId, await kvGetVisitante(lead.visitorId));
    }
    const visitante = cacheVisitantes.get(lead.visitorId);
    if (!visitante) return lead;
    return {
      ...lead,
      visitante: {
        totalVisitas: visitante.totalVisitas,
        primeiraVisita: visitante.primeiraVisita,
        imoveisVistos: visitante.imoveisVistos,
      },
    };
  }));

  return NextResponse.json({ leads: leadsEnriquecidos });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imovelId, imovelName, bairro, cidade, preco, oruloUrl, simulacao, cenarioProposta, favoritosCount, favoritosIds, atribuicao, conversao, contato } = body ?? {};

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
            entradaPlanejada:          typeof cenarioProposta.entradaPlanejada === 'number' ? cenarioProposta.entradaPlanejada : undefined,
            distribuido:               typeof cenarioProposta.distribuido === 'number' ? cenarioProposta.distribuido : undefined,
            necessidadeFinanciamento:  typeof cenarioProposta.necessidadeFinanciamento === 'number' ? cenarioProposta.necessidadeFinanciamento : undefined,
            capacidadeEstimada:        typeof cenarioProposta.capacidadeEstimada === 'number' ? cenarioProposta.capacidadeEstimada : undefined,
            diferencaRecursos:         typeof cenarioProposta.diferencaRecursos === 'number' ? cenarioProposta.diferencaRecursos : undefined,
          }
        : null;

    // Limite razoável no payload — favoritar 200 imóveis não deve inflar o registro do lead.
    const favoritosIdsValidos: string[] | undefined =
      Array.isArray(favoritosIds)
        ? favoritosIds.filter((x): x is string => typeof x === 'string').slice(0, 20)
        : undefined;

    const atribuicaoValida: LeadAtribuicao | null =
      atribuicao && typeof atribuicao === 'object' && typeof atribuicao.first_source === 'string'
        ? {
            first_source:           String(atribuicao.first_source),
            first_medium:           String(atribuicao.first_medium || ''),
            first_referrer_domain:  atribuicao.first_referrer_domain ? String(atribuicao.first_referrer_domain) : null,
            first_landing_page:     String(atribuicao.first_landing_page || ''),
            utm_source:             atribuicao.utm_source ? String(atribuicao.utm_source) : null,
            utm_medium:             atribuicao.utm_medium ? String(atribuicao.utm_medium) : null,
            utm_campaign:           atribuicao.utm_campaign ? String(atribuicao.utm_campaign) : null,
          }
        : null;

    const conversaoValida: LeadConversao | null =
      conversao && typeof conversao === 'object' && typeof conversao.conversion_action === 'string'
        ? {
            conversion_page:       String(conversao.conversion_page || ''),
            conversion_imovel_id:  conversao.conversion_imovel_id ? String(conversao.conversion_imovel_id) : null,
            conversion_action:     String(conversao.conversion_action),
          }
        : null;

    // Contato do formulário (fora do estado de SP) — nome e whatsapp são
    // obrigatórios pro registro fazer sentido; email é opcional.
    const contatoValido: LeadContato | null =
      contato && typeof contato === 'object' &&
      typeof contato.nome === 'string' && contato.nome.trim() &&
      typeof contato.whatsapp === 'string' && contato.whatsapp.replace(/\D/g, '').length >= 10
        ? {
            nome:     String(contato.nome).trim().slice(0, 120),
            email:    contato.email ? String(contato.email).trim().slice(0, 160) : '',
            whatsapp: String(contato.whatsapp).replace(/\D/g, '').slice(0, 13),
          }
        : null;

    const visitorId = req.cookies.get('fc_vid')?.value || null;

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
      favoritosIds:    favoritosIdsValidos,
      atribuicao:      atribuicaoValida,
      conversao:       conversaoValida,
      contato:         contatoValido,
      visitorId,
    });

    if (!lead) {
      // KV indisponível — não quebra a experiência do usuário no site
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    // Marca o visitante como "conhecido" — a partir de agora, as próximas
    // páginas de imóvel que ele abrir (mesmo sem novo contato) ficam
    // registradas no histórico dele (ver /api/visita e kvRegistrarVisita).
    if (visitorId) {
      await kvIdentificarVisitante(visitorId, lead.imovelId, contatoValido);
    }

    // Único canal de aviso pra leads de formulário (fora de SP) — sem isso,
    // o lead fica invisível até alguém abrir /admin/leads manualmente.
    if (contatoValido) {
      notificarLeadFormulario({
        imovelId:   lead.imovelId,
        imovelName: lead.imovelName,
        bairro:     lead.bairro,
        cidade:     lead.cidade,
        contato:    contatoValido,
      }).catch(() => { /* nunca deve travar a resposta ao usuário */ });
    }

    return NextResponse.json({ ok: true, lead });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
