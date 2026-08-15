/**
 * POST /api/conta/entrar — recebe um e-mail e envia um código de 6 dígitos
 * (login sem senha, sem link). Não confirma nem nega se o e-mail já tem
 * histórico no site — a resposta é sempre a mesma, pra não vazar isso.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { criarCodigoAcesso } from '@/lib/conta-kv';

const rateMap = new Map<string, { count: number; resetAt: number }>();
function checkRate(ip: string) {
  const now = Date.now();
  const ent = rateMap.get(ip);
  if (!ent || now > ent.resetAt) { rateMap.set(ip, { count: 1, resetAt: now + 60_000 }); return true; }
  if (ent.count >= 5) return false;
  ent.count++;
  return true;
}

function isEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRate(ip)) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde 1 minuto.' }, { status: 429 });
  }

  const { email } = await req.json().catch(() => ({ email: '' }));
  if (!email || typeof email !== 'string' || !isEmailValido(email)) {
    return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY não configurada');
    return NextResponse.json({ error: 'Serviço de e-mail não configurado.' }, { status: 500 });
  }

  const code = await criarCodigoAcesso(email.trim().toLowerCase());
  if (!code) {
    return NextResponse.json({ error: 'Não foi possível enviar agora. Tente novamente.' }, { status: 503 });
  }

  const resend = new Resend(RESEND_API_KEY);

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:20px;background:#f3f4f6;">
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;">
    <div style="background:#2563eb;padding:24px 32px;border-radius:12px 12px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:20px;">Seu código de acesso — FinancieCerto</h1>
    </div>
    <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
      <p style="font-size:15px;color:#111827;">Digite este código na página pra acessar sua conta — sem senha, é só isso.</p>
      <div style="text-align:center;margin:28px 0;">
        <span style="display:inline-block;background:#F8FAFC;border:1.5px solid #e5e7eb;border-radius:10px;padding:16px 28px;font-size:32px;font-weight:800;letter-spacing:8px;color:#111827;">${code}</span>
      </div>
      <p style="font-size:12px;color:#6b7280;">Este código expira em 10 minutos e só pode ser usado uma vez. Se você não pediu esse acesso, ignore este e-mail.</p>
    </div>
  </div>
</body></html>`;

  try {
    const { error } = await resend.emails.send({
      from:    'FinancieCerto <contato@financiecerto.com.br>',
      to:      [email.trim()],
      subject: `${code} é seu código de acesso — FinancieCerto`,
      html,
    });
    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Erro ao enviar e-mail.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Erro conta/entrar:', msg);
    return NextResponse.json({ error: 'Erro ao enviar.' }, { status: 500 });
  }
}
