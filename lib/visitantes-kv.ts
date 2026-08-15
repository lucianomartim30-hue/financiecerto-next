/**
 * lib/visitantes-kv.ts
 * Reconhecimento de visitante recorrente sem login — mesma ideia usada por
 * portais como o ImovelWeb. O cookie fc_vid (ver middleware.ts) identifica o
 * navegador; esse arquivo guarda, por fc_vid, a identidade (quando conhecida)
 * e os imóveis vistos, pra o corretor ver no /admin/leads o histórico de um
 * visitante mesmo que ele nunca tenha "logado" em nada.
 *
 * Só passa a existir registro pra um fc_vid DEPOIS que a pessoa se identifica
 * uma vez (clique de WhatsApp ou formulário) — não rastreia navegação anônima
 * de quem nunca converteu, pra não inflar o KV com tráfego que nunca vira lead.
 */

import type { LeadContato } from './leads-kv';

export interface Visitante {
  id: string;                 // = valor do cookie fc_vid
  nome?: string;
  email?: string;
  whatsapp?: string;
  primeiraVisita: string;     // ISO — primeira vez que viramos "conhecidos"
  ultimaVisita: string;       // ISO
  totalVisitas: number;       // contagem de páginas de imóvel vistas após identificado
  imoveisVistos: string[];    // ids do Orulo, mais recente primeiro, sem repetir
}

const KV_VISITANTES_KEY = 'visitantes:map';
const MAX_IMOVEIS_VISTOS = 20;

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

async function getMapa(): Promise<Record<string, Visitante>> {
  const kv = await getKv();
  if (!kv) return {};
  try {
    const raw = await kv.get(KV_VISITANTES_KEY);
    return (raw as Record<string, Visitante>) ?? {};
  } catch {
    return {};
  }
}

export async function kvGetVisitante(visitorId: string): Promise<Visitante | null> {
  const mapa = await getMapa();
  return mapa[visitorId] ?? null;
}

/** Chamado quando um lead é criado — grava/atualiza identidade e conta a visita ao imóvel do lead. */
export async function kvIdentificarVisitante(
  visitorId: string,
  imovelId: string,
  contato?: LeadContato | null,
): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  try {
    const mapa = await getMapa();
    const agora = new Date().toISOString();
    const atual = mapa[visitorId];
    const imoveisVistos = atual
      ? [imovelId, ...atual.imoveisVistos.filter(id => id !== imovelId)].slice(0, MAX_IMOVEIS_VISTOS)
      : [imovelId];

    mapa[visitorId] = {
      id: visitorId,
      nome:     contato?.nome     || atual?.nome,
      email:    contato?.email    || atual?.email,
      whatsapp: contato?.whatsapp || atual?.whatsapp,
      primeiraVisita: atual?.primeiraVisita ?? agora,
      ultimaVisita:   agora,
      totalVisitas:   (atual?.totalVisitas ?? 0) + 1,
      imoveisVistos,
    };
    await kv.set(KV_VISITANTES_KEY, mapa);
  } catch (e) {
    console.error('[visitantes-kv] identificar', e);
  }
}

/** Chamado a cada página de imóvel vista — só grava se o visitante já é conhecido (ver /api/visita). */
export async function kvRegistrarVisita(visitorId: string, imovelId: string): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  try {
    const mapa = await getMapa();
    const atual = mapa[visitorId];
    if (!atual) return; // visitante ainda não se identificou — nada a registrar

    mapa[visitorId] = {
      ...atual,
      ultimaVisita: new Date().toISOString(),
      totalVisitas: atual.totalVisitas + 1,
      imoveisVistos: [imovelId, ...atual.imoveisVistos.filter(id => id !== imovelId)].slice(0, MAX_IMOVEIS_VISTOS),
    };
    await kv.set(KV_VISITANTES_KEY, mapa);
  } catch (e) {
    console.error('[visitantes-kv] registrarVisita', e);
  }
}
