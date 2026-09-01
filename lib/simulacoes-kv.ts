/**
 * lib/simulacoes-kv.ts
 * Toda simulação concluída fica salva automaticamente — não só quando a
 * pessoa pede pra receber por e-mail. Guardada por "dono": "e:{email}" quando
 * logada (funciona em qualquer aparelho), ou "v:{fc_vid}" quando anônima
 * (só naquele aparelho, até ela logar — ver kvReivindicarSimulacoes).
 */

import { randomUUID } from 'crypto';

export interface SimulacaoSalva {
  id: string;
  criadoEm: string;
  modalidade: string;
  valorImovel: number;
  valorFinanciado: number;
  parcelaPrice: number;
  parcelaSAC: number;
  taxaAnual: number;
  prazoAnos: number;
  comprometimento: number;
}

const MAX_SIMULACOES = 20;

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

function chave(owner: string): string {
  return `simulacoes:${owner}`;
}

export async function kvSalvarSimulacao(owner: string, sim: Omit<SimulacaoSalva, 'id' | 'criadoEm'>): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  try {
    const atuais = ((await kv.get(chave(owner))) as SimulacaoSalva[]) ?? [];
    const nova: SimulacaoSalva = { ...sim, id: randomUUID(), criadoEm: new Date().toISOString() };
    await kv.set(chave(owner), [nova, ...atuais].slice(0, MAX_SIMULACOES));
  } catch (e) {
    console.error('[simulacoes-kv] salvar', e);
  }
}

export async function kvGetSimulacoes(owner: string): Promise<SimulacaoSalva[]> {
  const kv = await getKv();
  if (!kv) return [];
  try {
    return ((await kv.get(chave(owner))) as SimulacaoSalva[]) ?? [];
  } catch {
    return [];
  }
}

/** Remove uma simulação salva da conta — chamado por /conta quando a pessoa clica em remover. */
export async function kvRemoverSimulacao(owner: string, id: string): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  try {
    const atuais = await kvGetSimulacoes(owner);
    await kv.set(chave(owner), atuais.filter(s => s.id !== id));
  } catch (e) {
    console.error('[simulacoes-kv] remover', e);
  }
}

/** Migra simulações feitas antes do login naquele aparelho pra dentro da conta — chamado uma vez, no momento em que o código é confirmado. */
export async function kvReivindicarSimulacoes(visitorId: string | undefined, email: string): Promise<void> {
  if (!visitorId) return;
  const kv = await getKv();
  if (!kv) return;
  try {
    const doAparelho = await kvGetSimulacoes(`v:${visitorId}`);
    if (doAparelho.length === 0) return;
    const daConta = await kvGetSimulacoes(`e:${email}`);
    const idsExistentes = new Set(daConta.map(s => s.id));
    const mesclado = [...doAparelho.filter(s => !idsExistentes.has(s.id)), ...daConta]
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .slice(0, MAX_SIMULACOES);
    await kv.set(chave(`e:${email}`), mesclado);
    await kv.del(chave(`v:${visitorId}`));
  } catch (e) {
    console.error('[simulacoes-kv] reivindicar', e);
  }
}
