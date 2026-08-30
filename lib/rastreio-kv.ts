/**
 * lib/rastreio-kv.ts
 * Rastreamento de comportamento de visitante ANTES de virar lead — a peça que
 * faltava em relação ao lib/visitantes-kv.ts, que só grava histórico depois
 * que a pessoa se identifica (clique de WhatsApp ou formulário). Aqui, todo
 * fc_vid entra, mesmo quem nunca converte — é o que permite responder "quem
 * simulou financiamento mas não viu nenhum imóvel" (potencial lead invisível
 * hoje) e o inverso.
 *
 * Mesmo padrão de mapa único em uma chave (ver lib/promocoes-kv.ts) — mas como
 * aqui QUALQUER visitante entra (não só quem converte), o volume tende a ser
 * bem maior, então os registros expiram sozinhos (poda no próprio código, já
 * que TTL da KV é por chave inteira, não por entrada do mapa).
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

const KV_KEY = 'rastreio:map';
const MAX_IMOVEIS = 20;
const DIAS_EXPIRACAO = 60;

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

function expirado(r: RegistroAnonimo): boolean {
  const limite = Date.now() - DIAS_EXPIRACAO * 24 * 60 * 60 * 1000;
  return new Date(r.ultimaVisita).getTime() < limite;
}

async function getMapa(): Promise<Record<string, RegistroAnonimo>> {
  const kv = await getKv();
  if (!kv) return {};
  try {
    const raw = await kv.get(KV_KEY);
    return (raw as Record<string, RegistroAnonimo>) ?? {};
  } catch {
    return {};
  }
}

async function setMapa(mapa: Record<string, RegistroAnonimo>): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  await kv.set(KV_KEY, mapa);
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
    const mapa = await getMapa();

    // Poda entradas velhas a cada escrita — sem isso o mapa cresce pra sempre
    // (TTL da KV é por chave inteira, não dá pra expirar só uma entrada do JSON).
    for (const key of Object.keys(mapa)) {
      if (expirado(mapa[key])) delete mapa[key];
    }

    const agora = new Date().toISOString();
    const atual = mapa[visitorId];
    const imoveisVistos =
      evento.tipo === 'imovel' && evento.imovelId
        ? [evento.imovelId, ...(atual?.imoveisVistos ?? []).filter(id => id !== evento.imovelId)].slice(0, MAX_IMOVEIS)
        : (atual?.imoveisVistos ?? []);

    mapa[visitorId] = {
      id: visitorId,
      primeiraVisita: atual?.primeiraVisita ?? agora,
      ultimaVisita: agora,
      visitouSimulador: !!atual?.visitouSimulador || evento.tipo === 'simulador',
      visitouListagemImoveis: !!atual?.visitouListagemImoveis || evento.tipo === 'listagem',
      imoveisVistos,
      totalEventos: (atual?.totalEventos ?? 0) + 1,
    };

    await setMapa(mapa);
  } catch (e) {
    console.error('[rastreio-kv] registrarEvento', e);
  }
}

/** Todos os registros ainda válidos — usado pelo painel /admin/rastreio. */
export async function kvListarRastreios(): Promise<RegistroAnonimo[]> {
  const mapa = await getMapa();
  return Object.values(mapa).filter(r => !expirado(r));
}

/** Remove o rastro anônimo de um visitante — chamado quando ele vira lead, pra não duplicar em visitantes-kv. */
export async function kvRemoverRastreio(visitorId: string): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  try {
    const mapa = await getMapa();
    if (!(visitorId in mapa)) return;
    delete mapa[visitorId];
    await setMapa(mapa);
  } catch (e) {
    console.error('[rastreio-kv] removerRastreio', e);
  }
}
