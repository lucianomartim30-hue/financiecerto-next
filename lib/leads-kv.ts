/**
 * lib/leads-kv.ts
 * Armazenamento simples dos leads capturados automaticamente no clique do
 * WhatsApp — mesma infraestrutura (Vercel KV) já usada pelo catálogo Orulo.
 * Sem TTL: dado de negócio, não deve expirar sozinho.
 */

import { randomUUID } from 'crypto';

export type LeadStatus = 'novo' | 'conversando' | 'visita' | 'fechado' | 'perdido';

/** Simulação já feita pelo visitante antes do clique — contexto financeiro do lead (Fase 4). */
export interface LeadSimulacao {
  modalidade: string;              // MCMV | SBPE | SFI
  faixa?: string;
  renda?: number;
  parcela?: number;
  comprometimento?: number;        // % da renda
}

/** Fluxo de pagamento montado no simulador na planta — "cenário de proposta" (Fase 4 + Bloco A/B). */
export interface LeadCenarioProposta {
  valorImovel: number;
  fgts: number;
  ato: number;
  sinais: number;
  mensais: number;
  anuais: number;
  chaves: number;
  // Bloco A/B — modelo top-down completo (necessidade vs. capacidade vs. entrada planejada)
  entradaPlanejada?: number;
  distribuido?: number;
  necessidadeFinanciamento?: number;
  capacidadeEstimada?: number;
  diferencaRecursos?: number;
}

/** Origem da visita (first-touch) — nunca sobrescrita durante a sessão (Bloco B item 7). */
export interface LeadAtribuicao {
  first_source: string;
  first_medium: string;
  first_referrer_domain: string | null;
  first_landing_page: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

/** Ponto de conversão — página/ação no momento em que o lead foi gerado (Bloco B item 7). */
export interface LeadConversao {
  conversion_page: string;
  conversion_imovel_id: string | null;
  conversion_action: string;
}

/**
 * Dados de contato preenchidos no formulário — usado só fora do estado de SP,
 * onde não existe clique de WhatsApp (o corretor não atende presencialmente
 * nem fecha sozinho fora de SP, então o número dele não fica exposto; o
 * contato vira um registro que ele decide depois se vale repassar/atender).
 */
export interface LeadContato {
  nome: string;
  email: string;
  whatsapp: string;
}

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
  // Fase 4 — contexto financeiro, presente só quando o visitante já simulou antes do clique
  simulacao?: LeadSimulacao | null;
  cenarioProposta?: LeadCenarioProposta | null;
  favoritosCount?: number;
  // Bloco B — favoritos com identificação (não só a contagem), origem e ponto de conversão
  favoritosIds?: string[];
  atribuicao?: LeadAtribuicao | null;
  conversao?: LeadConversao | null;
  // Só presente em leads vindos do formulário (fora do estado de SP) — leads de
  // clique de WhatsApp não têm esse dado (a conversa acontece direto no WhatsApp).
  contato?: LeadContato | null;
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
  input: {
    imovelId: string; imovelName: string; bairro: string; cidade: string;
    preco: number | null; oruloUrl: string | null;
    simulacao?: LeadSimulacao | null;
    cenarioProposta?: LeadCenarioProposta | null;
    favoritosCount?: number;
    favoritosIds?: string[];
    atribuicao?: LeadAtribuicao | null;
    conversao?: LeadConversao | null;
    contato?: LeadContato | null;
  },
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
