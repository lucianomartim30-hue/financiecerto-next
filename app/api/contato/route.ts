import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Rate limiting simples (por IP, em memória)
const rateMap = new Map<string, { count: number; resetAt: number }>();
function checkRate(ip: string) {
  const now = Date.now();
  const e = rateMap.get(ip);
  if (!e || now > e.resetAt) { rateMap.set(ip, { count: 1, resetAt: now + 60_000 }); return true; }
  if (e.count >= 5) return false; // máx 5 envios/minuto por IP
  e.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRate(ip)) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde 1 minuto.' }, { status: 429 });
  }

  const { nome, email, telefone, assunto, mensagem, lgpd } = await req.json();

  // Validações básicas
  if (!nome?.trim() || !email?.trim() || !mensagem?.trim()) {
    return NextResponse.json({ error: 'Nome, e-mail e mensagem são obrigatórios.' }, { status: 400 });
  }
  if (!lgpd) {
    return NextResponse.json({ error: 'Consentimento LGPD obrigatório.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY não configurada');
    return NextResponse.json({ error: 'Serviço de email não configurado.' }, { status: 500 });
  }

  const resend = new Resend(RESEND_API_KEY);

  // Helper para escapar HTML mantendo acentos
  const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const wrap = (body: string) => `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:20px;background:#f3f4f6;">${body}</body></html>`;

  // Monta o email
  const html = wrap(`
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#2563eb;padding:24px 32px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">Nova mensagem &mdash; FinancieCerto</h1>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:120px;">Nome</td><td style="padding:8px 0;font-weight:700;color:#111827;">${esc(nome)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">E-mail</td><td style="padding:8px 0;font-weight:700;color:#2563eb;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
          ${telefone ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Telefone</td><td style="padding:8px 0;font-weight:700;">${esc(telefone)}</td></tr>` : ''}
          ${assunto ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Assunto</td><td style="padding:8px 0;font-weight:700;">${esc(assunto)}</td></tr>` : ''}
        </table>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
        <p style="font-size:13px;color:#6b7280;margin:0 0 8px;">Mensagem:</p>
        <p style="font-size:15px;color:#111827;line-height:1.7;white-space:pre-wrap;">${esc(mensagem)}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
        <p style="font-size:11px;color:#9ca3af;">Enviado via financiecerto.com.br &middot; LGPD aceito &middot; IP: ${ip}</p>
      </div>
    </div>
  `);

  // Email de confirmação para o usuário
  const htmlConfirmacao = wrap(`
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#16a34a;padding:24px 32px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">Mensagem recebida!</h1>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        <p style="font-size:15px;color:#111827;">Ol&aacute;, <strong>${esc(nome)}</strong>!</p>
        <p style="font-size:14px;color:#374151;line-height:1.7;">
          Recebemos sua mensagem e responderemos em at&eacute; <strong>2 dias &uacute;teis</strong>.
        </p>
        <div style="background:#F8FAFC;border-radius:10px;padding:16px 20px;margin:20px 0;">
          <p style="font-size:12px;color:#6b7280;margin:0 0 4px;">Sua mensagem:</p>
          <p style="font-size:13px;color:#374151;margin:0;white-space:pre-wrap;">${esc(mensagem.slice(0, 300))}${mensagem.length > 300 ? '...' : ''}</p>
        </div>
        <p style="font-size:13px;color:#6b7280;">
          Atenciosamente,<br/>
          <strong>Equipe FinancieCerto</strong><br/>
          <a href="https://www.financiecerto.com.br" style="color:#2563eb;">financiecerto.com.br</a>
        </p>
      </div>
    </div>
  `);

  try {
    // Envia para o administrador
    const { error } = await resend.emails.send({
      from:     'FinancieCerto <contato@financiecerto.com.br>',
      to:       ['contato@financiecerto.com.br'],
      subject:  `[Contato] ${assunto || 'Nova mensagem'} — ${nome}`,
      html,
      replyTo:  email,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Erro ao enviar email.' }, { status: 500 });
    }

    // Confirmação para o usuário (silenciosa se falhar)
    resend.emails.send({
      from:    'FinancieCerto <contato@financiecerto.com.br>',
      to:      [email],
      subject: 'Recebemos sua mensagem — FinancieCerto',
      html:    htmlConfirmacao,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Erro contato:', msg);
    return NextResponse.json({ error: `Erro ao enviar: ${msg}` }, { status: 500 });
  }
}
