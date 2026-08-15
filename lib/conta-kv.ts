/**
 * lib/conta-kv.ts
 * Login sem senha (magic link) — a pessoa informa o e-mail, recebe um link de
 * acesso único, e ao clicar vira uma sessão. Não existe cadastro de senha:
 * o e-mail em si já é a identidade. Único propósito de ter uma conta aqui é
 * reconhecer quem já pediu contato/alerta antes, sem pedir os dados de novo
 * — nunca é exigido pra navegar ou simular (ver reforço de mensagem no site).
 */

import { randomBytes } from 'crypto';

const TOKEN_TTL_SECONDS = 60 * 15;            // link de acesso expira em 15 min
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 90; // sessão dura 90 dias

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getKv(): Promise<any | null> {
  const hasConfig = !!(process.env.KV_REST_API_URL || process.env.KV_URL);
  if (!hasConfig) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch {
    return null;
  }
}

/** Gera um link de acesso de uso único pro e-mail informado. Retorna o token (não a URL). */
export async function criarLinkAcesso(email: string): Promise<string | null> {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const token = randomBytes(24).toString('hex');
    await kv.set(`conta:token:${token}`, email, { ex: TOKEN_TTL_SECONDS });
    return token;
  } catch (e) {
    console.error('[conta-kv] criarLinkAcesso', e);
    return null;
  }
}

/** Troca um token de acesso (uso único) por um token de sessão de longa duração. */
export async function trocarTokenPorSessao(token: string): Promise<string | null> {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const email = await kv.get(`conta:token:${token}`);
    if (!email || typeof email !== 'string') return null;
    await kv.del(`conta:token:${token}`); // uso único — não pode ser reaproveitado
    const sessionToken = randomBytes(24).toString('hex');
    await kv.set(`conta:sessao:${sessionToken}`, email, { ex: SESSION_TTL_SECONDS });
    return sessionToken;
  } catch (e) {
    console.error('[conta-kv] trocarTokenPorSessao', e);
    return null;
  }
}

export async function getEmailDaSessao(sessionToken: string | undefined): Promise<string | null> {
  if (!sessionToken) return null;
  const kv = await getKv();
  if (!kv) return null;
  try {
    const email = await kv.get(`conta:sessao:${sessionToken}`);
    return typeof email === 'string' ? email : null;
  } catch {
    return null;
  }
}

export async function encerrarSessao(sessionToken: string | undefined): Promise<void> {
  if (!sessionToken) return;
  const kv = await getKv();
  if (!kv) return;
  try {
    await kv.del(`conta:sessao:${sessionToken}`);
  } catch { /* ignore */ }
}
