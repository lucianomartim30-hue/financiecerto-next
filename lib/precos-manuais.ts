/**
 * lib/precos-manuais.ts
 *
 * Preço manual por planta, para empreendimentos cuja tabela de lançamento já
 * saiu mas a Orulo ainda não sincronizou os valores (o imóvel fica preso em
 * "Breve Lançamento" / "A Definir" mesmo já existindo tabela real). Chave =
 * id do imóvel na Orulo — sobrepõe SÓ o preço, preservando fotos, descrição,
 * blueprints e todo o resto que a Orulo já fornece pra esse id.
 *
 * Cada planta usa o MENOR valor encontrado na tabela pra ela ("a partir de"),
 * mesma convenção de qualquer anúncio.
 */
export interface PrecoManualPlanta {
  /** Área da planta (m²) — casada com o `area`/`private_area` que a Orulo já retorna pra essa tipologia. */
  area: number;
  /** Menor valor de venda ("a partir de") encontrado na tabela pra essa planta. */
  priceFrom: number;
}

export const PRECOS_MANUAIS: Record<string, PrecoManualPlanta[]> = {
  // Oásis Santa Cruz by Diálogo (id 83507) — tabela de pré-lançamento
  // set/2026, recebida diretamente da construtora. Menor "Valor Total do
  // Negócio" de cada planta já cadastrada na Orulo:
  '83507': [
    { area: 32, priceFrom: 358000 },  // Planta 01 — 1 dorm 32m² (finais 4/5/6/11, 4º-8º pav — 32,40m²)
    { area: 45, priceFrom: 505000 },  // Planta 01 — 2 dorms 45m² (final 12, 8º-12º pav — 44,99m²)
    { area: 59, priceFrom: 775000 },  // Planta 03 — 2 dorms 59m² (finais 1/14, 3º-4º pav — 59,16m²)
    { area: 69, priceFrom: 845000 },  // Planta 04 — 2 dorms 69m² (finais 7/8, 3º pav — 69,86m²)
    { area: 97, priceFrom: 1173000 }, // Planta 05 — 3 dorms 97m² (final 1, 3º pav — 97,52m²)
  ],
};

/** Menor preço entre todas as plantas do empreendimento — vira o "a partir de" do card/ficha. */
export function precoManualMin(id: string): number | null {
  const precos = PRECOS_MANUAIS[id];
  if (!precos || precos.length === 0) return null;
  return Math.min(...precos.map(p => p.priceFrom));
}

/** Preço da planta mais próxima dessa área (tolerância de 3m² pra cobrir arredondamento entre PDF e Orulo). */
export function precoManualPorArea(id: string, area: number): number | null {
  const precos = PRECOS_MANUAIS[id];
  if (!precos || !isFinite(area)) return null;
  let melhor: PrecoManualPlanta | null = null;
  let menorDist = Infinity;
  for (const p of precos) {
    const dist = Math.abs(p.area - area);
    if (dist < menorDist) { menorDist = dist; melhor = p; }
  }
  return melhor && menorDist <= 3 ? melhor.priceFrom : null;
}

/**
 * Remove o sufixo "- Breve Lançamento" do nome quando esse id já tem preço
 * manual (a Orulo ainda não atualizou o nome, só o preço ficou pendente) —
 * evita a página mostrar "Lançamento" com preços reais mas o título ainda
 * dizendo "Breve Lançamento".
 */
export function limparNomeSeLancado(id: string, name: string): string {
  if (!PRECOS_MANUAIS[id]) return name;
  return name.replace(/\s*-\s*Breve Lançamento\s*$/i, '');
}
