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
  unidade?: string;         // "605" — número/identificação da unidade em destaque (público — a oferta é pra essa unidade específica)
  areaM2?: number;          // 28 (NUNCA público, ver paraPublico — não agrega à mensagem, é só referência interna)
  andar?: string;           // "6º andar" — público
  precoOriginal?: number;   // preço de tabela da construtora pra essa unidade, antes do desconto
  precoPromocional: number; // 649000
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

export type PromocaoPublica = Omit<Promocao, 'areaM2'>;

/**
 * Área nunca pode chegar a quem não é admin — não agrega nada à mensagem
 * pública (unidade + andar já deixam claro qual é a oferta) e é um dado a
 * mais que só interessa pro corretor localizar a unidade internamente.
 * Redige na origem (não em cada rota que consome isso), pra não depender de
 * ninguém lembrar de filtrar depois.
 */
function paraPublico(promos: Promocao[]): PromocaoPublica[] {
  return promos.map(({ areaM2: _areaM2, ...resto }) => resto);
}

/** Promoções ativas (não vencidas) de um empreendimento, sem área — usado pelo site público. */
export async function kvGetPromocoes(buildingId: string): Promise<PromocaoPublica[]> {
  const mapa = await getMapa();
  return paraPublico((mapa[buildingId] ?? []).filter(estaValida));
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
 * Todas as promoções ativas por empreendimento, já redigidas (sem área) —
 * pra mostrar no card de /imoveis sem precisar de uma chamada por card.
 * Quando um empreendimento tem várias unidades em promoção, todas vêm na
 * lista — o card mostra cada uma, não só a mais barata.
 */
export async function kvGetTodasPromocoesPublicas(): Promise<Record<string, PromocaoPublica[]>> {
  const ativo = await kvGetTodasPromocoesAtivas();
  const publicas: Record<string, PromocaoPublica[]> = {};
  for (const [buildingId, promos] of Object.entries(ativo)) {
    publicas[buildingId] = paraPublico(promos);
  }
  return publicas;
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
