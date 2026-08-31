/**
 * lib/rastreio-kv.ts
 * Rastreamento de comportamento de visitante ANTES de virar lead — a peça que
 * faltava em relação ao lib/visitantes-kv.ts, que só grava histórico depois
 * que a pessoa se identifica (clique de WhatsApp ou formulário). Aqui, todo
 * fc_vid entra, mesmo quem nunca converte — é o que permite responder "quem
 * simulou financiamento mas não viu nenhum imóvel" (potencial lead invisível
 * hoje) e o inverso.
 *
 * Uma chave por visitante (não um mapa único) — isso dispara em praticamente
 * toda visita ao site (listagem, imóvel, simulação), então precisa ser barato:
 * cada evento só lê/escreve o registro daquele visitante, nunca o site
 * inteiro. TTL nativo da KV expira sozinho (60 dias), sem poda manual.
 * Versão anterior usava um mapa único — reescrever esse JSON gigante a cada
 * visita anônima consumiu CPU rápido demais no plano Hobby da Vercel
 * (detectado 2026-08-31, corrigido no mesmo dia).
 */

export interface RegistroAnonimo {
  id: string;                      // = fc_vid
  primeiraVisita: string;          // ISO
  ultimaVisita: string;            // ISO
  visitouSimulador: boolean;       // completou ao menos 1 simulação (ver /api/simulacoes)
  visitouListagemImoveis: boolean; // abriu /imoveis (a vitrine)
  imoveisVistos: string[];         // ids Orulo de páginas de imóvel abertas, mais recente primeiro
  totalEventos: number;
}

const KV_PREFIX = 'rastreio:v:';
const MAX_IMOVEIS = 20;
const DIAS_EXPIRACAO = 60;
const TTL_SEGUNDOS = DIAS_EXPIRACAO * 24 * 60 * 60;

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

export type TipoEvento = 'imovel' | 'simulador' | 'listagem';

/** Registra um evento anônimo — chamado de /api/visita, /api/simulacoes e /api/rastreio. */
export async function kvRegistrarEvento(
  visitorId: string,
  evento: { tipo: TipoEvento; imovelId?: string },
): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  try {
    const key = KV_PREFIX + visitorId;
    const atual = ((await kv.get(key)) as RegistroAnonimo | null) ?? null;

    const agora = new Date().toISOString();
    const imoveisVistos =
      evento.tipo === 'imovel' && evento.imovelId
        ? [evento.imovelId, ...(atual?.imoveisVistos ?? []).filter(id => id !== evento.imovelId)].slice(0, MAX_IMOVEIS)
        : (atual?.imoveisVistos ?? []);

    const registro: RegistroAnonimo = {
      id: visitorId,
      primeiraVisita: atual?.primeiraVisita ?? agora,
      ultimaVisita: agora,
      visitouSimulador: !!atual?.visitouSimulador || evento.tipo === 'simulador',
      visitouListagemImoveis: !!atual?.visitouListagemImoveis || evento.tipo === 'listagem',
      imoveisVistos,
      totalEventos: (atual?.totalEventos ?? 0) + 1,
    };

    await kv.set(key, registro, { ex: TTL_SEGUNDOS });
  } catch (e) {
    console.error('[rastreio-kv] registrarEvento', e);
  }
}

/** Todos os registros ainda válidos — usado pelo painel /admin/leads (aba Rastreio). Só roda quando o admin abre a aba, não a cada visita. */
export async function kvListarRastreios(): Promise<RegistroAnonimo[]> {
  const kv = await getKv();
  if (!kv) return [];
  try {
    const keys = (await kv.keys(`${KV_PREFIX}*`)) as string[];
    if (!keys || keys.length === 0) return [];
    const valores = (await kv.mget(...keys)) as (RegistroAnonimo | null)[];
    return valores.filter((v): v is RegistroAnonimo => !!v);
  } catch (e) {
    console.error('[rastreio-kv] listarRastreios', e);
    return [];
  }
}

/** Remove o rastro anônimo de um visitante — chamado quando ele vira lead, pra não duplicar em visitantes-kv. */
export async function kvRemoverRastreio(visitorId: string): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  try {
    await kv.del(KV_PREFIX + visitorId);
  } catch (e) {
    console.error('[rastreio-kv] removerRastreio', e);
  }
}
