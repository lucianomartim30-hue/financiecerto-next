/**
 * lib/conta-kv.ts
 * Login sem senha — código de 6 dígitos por e-mail (mesma lógica que a
 * maioria dos apps grandes usa: mais rápido que link, porque a pessoa digita
 * o código ali mesmo na página, sem trocar de app). Não existe cadastro de
 * senha: o e-mail em si já é a identidade, e é a CONTA (não o aparelho) que
 * guarda o que a pessoa fez — logar num aparelho novo mostra tudo de novo.
 * Nunca é exigido pra navegar ou simular (ver reforço de mensagem no site).
 */

import { randomBytes } from 'crypto';

const CODE_TTL_SECONDS = 60 * 10;              // código expira em 10 min
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 90; // sessão dura 90 dias
const MAX_TENTATIVAS = 5;                      // limite de tentativas erradas por código

interface CodigoEntry { code: string; tentativas: number; }

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

/** Gera e grava um código de 6 dígitos pro e-mail informado. Retorna o código (pra enviar por e-mail). */
export async function criarCodigoAcesso(email: string): Promise<string | null> {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await kv.set(`conta:codigo:${email}`, { code, tentativas: 0 } as CodigoEntry, { ex: CODE_TTL_SECONDS });
    return code;
  } catch (e) {
    console.error('[conta-kv] criarCodigoAcesso', e);
    return null;
  }
}

/** Confere o código digitado. Bloqueia após MAX_TENTATIVAS erradas (força pedir um novo código). */
export async function verificarCodigo(email: string, code: string): Promise<string | null> {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const entry = (await kv.get(`conta:codigo:${email}`)) as CodigoEntry | null;
    if (!entry) return null;
    if (entry.tentativas >= MAX_TENTATIVAS) {
      await kv.del(`conta:codigo:${email}`);
      return null;
    }
    if (entry.code !== code) {
      await kv.set(`conta:codigo:${email}`, { ...entry, tentativas: entry.tentativas + 1 }, { ex: CODE_TTL_SECONDS });
      return null;
    }
    await kv.del(`conta:codigo:${email}`); // uso único
    const sessionToken = randomBytes(24).toString('hex');
    await kv.set(`conta:sessao:${sessionToken}`, email, { ex: SESSION_TTL_SECONDS });
    return sessionToken;
  } catch (e) {
    console.error('[conta-kv] verificarCodigo', e);
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
