/**
 * lib/leads-kv.ts
 * Armazenamento simples dos leads capturados automaticamente no clique do
 * WhatsApp — mesma infraestrutura (Vercel KV) já usada pelo catálogo Orulo.
 * Sem TTL: dado de negócio, não deve expirar sozinho.
 */

import { randomUUID } from 'crypto';

export type LeadStatus = 'novo' | 'conversando' | 'visita' | 'fechado' | 'perdido';

export interface Lead {
  id: string;
  imovelId: string;
  imovelName: string;
  bairro: string;
  cidade: string;
  preco: number | null;
  oruloUrl: string | null;
  criadoEm: string;
  status: LeadStatus;
  nota: string;
}

const KV_LEADS_KEY = 'leads:list';

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

export async function kvGetLeads(): Promise<Lead[]> {
  const kv = await getKv();
  if (!kv) return [];
  try {
    const raw = await kv.get(KV_LEADS_KEY);
    return (raw as Lead[]) ?? [];
  } catch {
    return [];
  }
}

export async function kvAddLead(
  input: { imovelId: string; imovelName: string; bairro: string; cidade: string; preco: number | null; oruloUrl: string | null },
): Promise<Lead | null> {
  const kv = await getKv();
  if (!kv) return null;

  const lead: Lead = {
    ...input,
    id: randomUUID(),
    criadoEm: new Date().toISOString(),
    status: 'novo',
    nota: '',
  };

  try {
    const leads = await kvGetLeads();
    leads.unshift(lead); // mais recente primeiro
    await kv.set(KV_LEADS_KEY, leads);
    return lead;
  } catch (e) {
    console.error('[leads-kv] addLead', e);
    return null;
  }
}

export async function kvUpdateLead(
  id: string,
  patch: Partial<Pick<Lead, 'status' | 'nota'>>,
): Promise<Lead | null> {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const leads = await kvGetLeads();
    const idx = leads.findIndex(l => l.id === id);
    if (idx === -1) return null;
    leads[idx] = { ...leads[idx], ...patch };
    await kv.set(KV_LEADS_KEY, leads);
    return leads[idx];
  } catch (e) {
    console.error('[leads-kv] updateLead', e);
    return null;
  }
}
