/**
 * lib/buscas-salvas-kv.ts
 * Buscas salvas — Fase 3 do roadmap estratégico. Diferente dos favoritos
 * (anônimos, só localStorage), uma busca salva exige contato (telefone ou
 * e-mail) porque o objetivo é justamente permitir avisar a pessoa depois —
 * por isso vive no KV (servidor), não no navegador.
 * Mesmo padrão de armazenamento de lib/leads-kv.ts.
 */

import { randomUUID } from 'crypto';

export interface BuscaSalva {
  id: string;
  contato: string;              // telefone ou e-mail informado
  descricaoFiltros: string;     // texto amigável, ex: "2+ quartos, até R$ 500.000, Moema"
  filtrosQuery: string;         // querystring bruta de /imoveis no momento do save (para reconstruir o link)
  consentimento: boolean;       // LGPD — sempre true (bloqueado no form), guardado para auditoria
  criadoEm: string;
  ativa: boolean;                // permite "desativar" sem apagar (ex: pedido de remoção)
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
  input: { contato: string; descricaoFiltros: string; filtrosQuery: string },
): Promise<BuscaSalva | null> {
  const kv = await getKv();
  if (!kv) return null;

  const busca: BuscaSalva = {
    ...input,
    id: randomUUID(),
    consentimento: true,
    criadoEm: new Date().toISOString(),
    ativa: true,
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
