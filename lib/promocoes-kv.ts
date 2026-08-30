/**
 * lib/promocoes-kv.ts
 * Promoções manuais por empreendimento — condições especiais que o corretor
 * recebe direto da construtora (condomínio grátis, pontos Livelo, preço de
 * unidade específica) e que a Orulo não tem como saber, porque não vêm do
 * catálogo público do empreendimento. Mesmo padrão de curadoria manual do
 * lib/fotos-ocultas-kv.ts: mapa por buildingId guardado na KV, editado em
 * /admin/promocoes.
 *
 * Quando a construtora tem mais de uma unidade na mesma condição especial,
 * cadastre uma Promocao POR unidade (cada uma com seu andar/preço/unidade) —
 * o card e a página do imóvel mostram todas, com as características de
 * cada uma, em vez de um número agregado.
 */

export interface Promocao {
  id: string;               // gerado na criação, usado pra editar/remover
  unidade?: string;         // "605" — número/identificação da unidade em destaque
  tipo?: string;            // "Garden" | "Duplex" | "Studio" | "Apartamento" | "Sala" — precisa ficar visível, muda a expectativa de quem vê (ex: Garden não é apartamento comum)
  areaM2?: number;          // 28 — pública: ajuda a pessoa a entender o que está levando
  quartos?: number;         // dormitórios da unidade em promoção
  vagas?: number;           // vagas de garagem da unidade em promoção
  andar?: string;           // "6º andar"
  precoOriginal?: number;   // preço de tabela da construtora pra essa unidade, antes do desconto — mostrado riscado, pra pessoa ver quanto economiza
  precoPromocional: number; // 649000
  ultimaUnidade?: boolean;  // true quando é a última/única unidade dessa característica no empreendimento — troca a mensagem "demais unidades a partir de X" (que ficaria falsa) por um aviso de urgência
  beneficio?: string;       // "6 meses de condomínio grátis" | "60 mil pontos Livelo"
  validoAte?: string;       // ISO date (YYYY-MM-DD) — some sozinha do site depois dessa data
  observacao?: string;      // texto livre, ex: "sujeito a disponibilidade"
  criadoEm: string;         // ISO datetime
}

const KV_KEY = 'promocoes:map'; // { [buildingId]: Promocao[] }

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

async function getMapa(): Promise<Record<string, Promocao[]>> {
  const kv = await getKv();
  if (!kv) return {};
  try {
    const raw = await kv.get(KV_KEY);
    return (raw as Record<string, Promocao[]>) ?? {};
  } catch {
    return {};
  }
}

async function setMapa(mapa: Record<string, Promocao[]>): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  await kv.set(KV_KEY, mapa);
}

/** Uma promoção "vence" à meia-noite (fuso do servidor) do dia seguinte a validoAte. */
function estaValida(p: Promocao): boolean {
  if (!p.validoAte) return true;
  const hoje = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return p.validoAte >= hoje;
}

export type PromocaoPublica = Promocao;

/** Promoções ativas (não vencidas) de um empreendimento — usado pelo site público. */
export async function kvGetPromocoes(buildingId: string): Promise<PromocaoPublica[]> {
  const mapa = await getMapa();
  return (mapa[buildingId] ?? []).filter(estaValida);
}

/**
 * Todas as promoções ativas de todos os empreendimentos, indexadas por
 * buildingId — usado pra marcar o badge "🔥 Promoção" nos cards de /imoveis
 * sem precisar de uma chamada por card.
 */
export async function kvGetTodasPromocoesAtivas(): Promise<Record<string, Promocao[]>> {
  const mapa = await getMapa();
  const ativo: Record<string, Promocao[]> = {};
  for (const [buildingId, promos] of Object.entries(mapa)) {
    const validas = promos.filter(estaValida);
    if (validas.length > 0) ativo[buildingId] = validas;
  }
  return ativo;
}

/**
 * Todas as promoções ativas por empreendimento — pra mostrar no card de
 * /imoveis sem precisar de uma chamada por card. Quando um empreendimento
 * tem várias unidades em promoção, todas vêm na lista — o card mostra cada
 * uma, não só a mais barata.
 */
export async function kvGetTodasPromocoesPublicas(): Promise<Record<string, PromocaoPublica[]>> {
  return kvGetTodasPromocoesAtivas();
}

/** Todas as promoções (inclusive vencidas) de um empreendimento — usado no painel admin. */
export async function kvGetPromocoesAdmin(buildingId: string): Promise<Promocao[]> {
  const mapa = await getMapa();
  return mapa[buildingId] ?? [];
}

export async function kvAdicionarPromocao(
  buildingId: string,
  dados: Omit<Promocao, 'id' | 'criadoEm'>,
): Promise<Promocao> {
  const mapa = await getMapa();
  const promocao: Promocao = {
    ...dados,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    criadoEm: new Date().toISOString(),
  };
  mapa[buildingId] = [...(mapa[buildingId] ?? []), promocao];
  await setMapa(mapa);
  return promocao;
}

export async function kvRemoverPromocao(buildingId: string, promocaoId: string): Promise<void> {
  const mapa = await getMapa();
  const atual = mapa[buildingId] ?? [];
  const restante = atual.filter(p => p.id !== promocaoId);
  if (restante.length === 0) delete mapa[buildingId];
  else mapa[buildingId] = restante;
  await setMapa(mapa);
}
