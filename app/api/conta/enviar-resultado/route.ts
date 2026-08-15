/**
 * POST /api/conta/enviar-resultado — envia o resultado de uma simulação por
 * e-mail (usado tanto pelo botão no simulador quanto pelo "reenviar" em
 * /conta, pra simulações já salvas). A simulação em si já foi salva
 * automaticamente (ver /api/simulacoes) — isso aqui só entrega uma cópia
 * imediata por e-mail. Nunca é exigido pra simular.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

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
function fmtBRL(v: number): string {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

interface ResumoSimulacao {
  modalidade: string;
  valorImovel: number;
  valorFinanciado: number;
  parcelaPrice: number;
  parcelaSAC: number;
  taxaAnual: number;
  prazoAnos: number;
  comprometimento: number;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRate(ip)) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde 1 minuto.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const r = body?.resumo as Partial<ResumoSimulacao> | undefined;

  if (!email || !isEmailValido(email)) {
    return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
  }
  if (!r || typeof r.parcelaPrice !== 'number' || typeof r.valorImovel !== 'number') {
    return NextResponse.json({ error: 'Resultado da simulação inválido.' }, { status: 400 });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY não configurada');
    return NextResponse.json({ error: 'Serviço de e-mail não configurado.' }, { status: 500 });
  }

  const resend = new Resend(RESEND_API_KEY);

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:20px;background:#f3f4f6;">
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;">
    <div style="background:#2563eb;padding:24px 32px;border-radius:12px 12px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:20px;">Seu resultado de simulação — FinancieCerto</h1>
    </div>
    <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <p style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">${r.modalidade || 'Financiamento'}</p>
        <p style="font-size:34px;font-weight:800;color:#111827;margin:0;">${fmtBRL(r.parcelaPrice)}</p>
        <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">parcela inicial (Price) · ${r.comprometimento ? `${r.comprometimento.toFixed(1)}% da renda` : ''}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Valor do imóvel</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#111827;border-bottom:1px solid #e5e7eb;">${fmtBRL(r.valorImovel)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Valor financiado</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#111827;border-bottom:1px solid #e5e7eb;">${fmtBRL(r.valorFinanciado || 0)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Taxa</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#111827;border-bottom:1px solid #e5e7eb;">${r.taxaAnual || 0}% a.a.</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Prazo</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#111827;border-bottom:1px solid #e5e7eb;">${r.prazoAnos || 0} anos</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Parcela SAC (1ª)</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#111827;">${fmtBRL(r.parcelaSAC || 0)}</td></tr>
      </table>
      <div style="text-align:center;margin:28px 0 8px;padding-top:20px;border-top:1px solid #e5e7eb;">
        <p style="font-size:13px;color:#374151;margin:0 0 14px;">Essa e outras simulações ficam salvas na sua conta — acesse quando quiser com este mesmo e-mail:</p>
        <a href="https://www.financiecerto.com.br/conta" style="display:inline-block;background:#2563eb;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">Acessar minha conta →</a>
      </div>
      <p style="font-size:11px;color:#9ca3af;margin-top:20px;">Simulação educativa — não constitui proposta de crédito. Valores exatos confirmados em cada instituição financeira.</p>
    </div>
  </div>
</body></html>`;

  try {
    const { error } = await resend.emails.send({
      from:    'FinancieCerto <contato@financiecerto.com.br>',
      to:      [email],
      subject: 'Seu resultado de simulação — FinancieCerto',
      html,
    });
    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Erro ao enviar e-mail.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Erro conta/enviar-resultado:', msg);
    return NextResponse.json({ error: 'Erro ao enviar.' }, { status: 500 });
  }
}
