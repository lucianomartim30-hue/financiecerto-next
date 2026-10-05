/**
 * lib/scp-sem-preco.ts
 *
 * Empreendimentos ainda não lançados que estão sendo comercializados no modelo
 * SCP (Sociedade em Conta de Participação) pra investidores, com valores que
 * devem ser consultados — o site NÃO mostra preço nenhum pra eles, só o aviso.
 *
 * Cadastro único: o preço vem da Órulo (min_price/typology_ranges), das
 * promoções do admin (lib/promocoes-kv.ts) e das tipologias da API de detalhe;
 * todos esses caminhos consultam esta lista. Pra voltar a mostrar preço, é só
 * remover o id daqui (o catálogo se corrige no próximo sync diário ou com
 * /api/admin/refresh-building).
 */

export const AVISO_SCP_SEM_PRECO =
  'Empreendimento ainda não lançado, comercializado no modelo SCP (Sociedade em Conta de Participação) para investidores que buscam as melhores condições antes do lançamento. Os valores devem ser consultados para confirmar os preços.';

/** Frase curta pra meta description / cartões. */
export const AVISO_SCP_CURTO = 'Pré-lançamento no modelo SCP para investidores — consulte os valores.';

// Chave = id do imóvel na Órulo.
const SCP_SEM_PRECO = new Set<string>([
  '81515', // W Stay Perdizes
]);

export function scpSemPreco(id: string | number | null | undefined): boolean {
  return id != null && SCP_SEM_PRECO.has(String(id));
}

interface ComPreco {
  id: string;
  min_price: number | null;
  max_price: number | null;
  typology_ranges?: Array<{ price_min: number | null; price_max: number | null }>;
}

// min_price 0.1 é a sentinela da Órulo pra "Breve Lançamento sem tabela
// publicada": todo o site já trata como "sem preço" (ver temPrecoReal em
// lib/filtro-breve-lancamento.ts), então não precisa de caso especial nos
// cartões, no sitemap, no JSON-LD nem no título.
const PRECO_SENTINELA = 0.1;

export function ocultarPrecoCatalogo<T extends ComPreco>(b: T): T {
  if (!scpSemPreco(b.id)) return b;
  return {
    ...b,
    min_price: PRECO_SENTINELA,
    max_price: null,
    typology_ranges: b.typology_ranges?.map(t => ({ ...t, price_min: null, price_max: null })),
  };
}

/** Aplica em lista inteira sem copiar quando nenhum id da lista está cadastrado. */
export function ocultarPrecosScpLista<T extends ComPreco>(lista: T[] | null): T[] | null {
  if (!lista) return lista;
  const idx = lista.findIndex(b => scpSemPreco(b.id));
  if (idx < 0) return lista;
  const copia = lista.slice();
  for (let i = idx; i < copia.length; i++) copia[i] = ocultarPrecoCatalogo(copia[i]);
  return copia;
}
