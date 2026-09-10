/**
 * lib/buscas-salvas-kv.ts
 * Buscas salvas — Fase 3 do roadmap estratégico. Diferente dos favoritos
 * (anônimos, só localStorage), uma busca salva exige contato (telefone ou
 * e-mail) porque o objetivo é justamente permitir avisar a pessoa depois —
 * por isso vive no KV (servidor), não no navegador.
 * Mesmo padrão de armazenamento de lib/leads-kv.ts.
 */

import { randomUUID } from 'crypto';

/** Texto de consentimento vigente no formulário — mudar a versão sempre que o texto mudar (auditoria LGPD). */
export const VERSAO_CONSENTIMENTO_ATUAL = 'v1-2026-08';
export const FINALIDADE_CONSENTIMENTO =
  'notificar o titular por WhatsApp e/ou e-mail sobre imóveis compatíveis com os filtros desta busca';

export interface BuscaSalva {
  id: string;
  whatsapp: string;              // obrigatório — canal que já é usado hoje pra atender
  email: string;                 // opcional ('' se não informado) — único canal automatizável hoje (Zoho Mail)
  descricaoFiltros: string;     // texto amigável, ex: "2+ quartos, até R$ 500.000, Moema"
  filtrosQuery: string;         // querystring bruta de /imoveis no momento do save (para reconstruir o link)
  consentimento: boolean;       // LGPD — sempre true (bloqueado no form), guardado para auditoria
  criadoEm: string;
  ativa: boolean;                // permite "desativar" sem apagar (ex: pedido de remoção)
  // LGPD — rastro de auditoria do consentimento (Bloco C, item 10). Sem isso não dá pra
  // provar o que a pessoa autorizou, quando, nem revogar de forma verificável depois.
  consentidoEm: string;
  versaoConsentimento: string;
  finalidade: string;
  canalAutorizado: ('whatsapp' | 'email')[];
  revogadoEm: string | null;
}

const KV_KEY = 'buscas-salvas:list';

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

export async function kvGetBuscasSalvas(): Promise<BuscaSalva[]> {
  const kv = await getKv();
  if (!kv) return [];
  try {
    const raw = await kv.get(KV_KEY);
    return (raw as BuscaSalva[]) ?? [];
  } catch {
    return [];
  }
}

export async function kvAddBuscaSalva(
  input: { whatsapp: string; email: string; descricaoFiltros: string; filtrosQuery: string },
): Promise<BuscaSalva | null> {
  const kv = await getKv();
  if (!kv) return null;

  const agora = new Date().toISOString();
  const busca: BuscaSalva = {
    ...input,
    id: randomUUID(),
    consentimento: true,
    criadoEm: agora,
    ativa: true,
    consentidoEm: agora,
    versaoConsentimento: VERSAO_CONSENTIMENTO_ATUAL,
    finalidade: FINALIDADE_CONSENTIMENTO,
    canalAutorizado: input.email ? ['whatsapp', 'email'] : ['whatsapp'],
    revogadoEm: null,
  };

  try {
    const buscas = await kvGetBuscasSalvas();
    buscas.unshift(busca);
    await kv.set(KV_KEY, buscas);
    return busca;
  } catch (e) {
    console.error('[buscas-salvas-kv] add', e);
    return null;
  }
}

/** Cancela (revoga) uma busca salva pelo próprio id — usado tanto pelo link de
 * cancelamento enviado ao titular quanto pelo painel admin. Não permite
 * reativar por essa via (a pessoa que revogou o consentimento tem que pedir
 * de novo, não é um "desligar/ligar" arbitrário). */
export async function kvRevogarBuscaSalva(id: string): Promise<BuscaSalva | null> {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const buscas = await kvGetBuscasSalvas();
    const idx = buscas.findIndex(b => b.id === id);
    if (idx === -1) return null;
    buscas[idx] = { ...buscas[idx], ativa: false, revogadoEm: new Date().toISOString() };
    await kv.set(KV_KEY, buscas);
    return buscas[idx];
  } catch (e) {
    console.error('[buscas-salvas-kv] revogar', e);
    return null;
  }
}
