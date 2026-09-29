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
  /** Unidades dessa planta no empreendimento (ficha técnica da construtora). */
  units?: number;
}

export const PRECOS_MANUAIS: Record<string, PrecoManualPlanta[]> = {
  // Oásis Santa Cruz by Diálogo (id 83507) — tabela de pré-lançamento
  // set/2026, recebida diretamente da construtora. Menor "Valor Total do
  // Negócio" de cada planta já cadastrada na Orulo. Unidades: ficha técnica
  // de treinamento da construtora (set/2026).
  '83507': [
    // 1 dorm 32m²: a ficha técnica junta "26m² a 32m² — studios e 1 suíte" numa
    // única faixa HIS de 105 unidades (studios de 26-28m² + esta de 32m²) — não
    // dá pra isolar só a de 32m² nesse material; usamos o total da faixa.
    { area: 32, priceFrom: 358000, units: 105 },  // Planta 01 — 1 dorm 32m² (finais 4/5/6/11, 4º-8º pav — 32,40m²)
    { area: 45, priceFrom: 505000, units: 77 },   // Planta 01 — 2 dorms 45m² (final 12, 8º-12º pav — 44,99m²) — HMP
    { area: 59, priceFrom: 775000, units: 89 },   // Planta 03 — 2 dorms 59m² (finais 1/14, 3º-4º pav — 59,16m²) — Residencial
    { area: 69, priceFrom: 845000, units: 112 },  // Planta 04 — 2 dorms 69m² (finais 7/8, 3º pav — 69,86m²) — Residencial
    { area: 97, priceFrom: 1173000, units: 110 }, // Planta 05 — 3 dorms 97m² (final 1, 3º pav — 97,52m²) — Residencial (43 c/2 vagas + 67 c/1 vaga)
  ],
};

/** Menor preço entre todas as plantas do empreendimento — vira o "a partir de" do card/ficha. */
export function precoManualMin(id: string): number | null {
  const precos = PRECOS_MANUAIS[id];
  if (!precos || precos.length === 0) return null;
  return Math.min(...precos.map(p => p.priceFrom));
}

/** Planta mais próxima dessa área (tolerância de 3m² pra cobrir arredondamento entre PDF e Orulo). */
export function plantaManualPorArea(id: string, area: number): PrecoManualPlanta | null {
  const precos = PRECOS_MANUAIS[id];
  if (!precos || !isFinite(area)) return null;
  let melhor: PrecoManualPlanta | null = null;
  let menorDist = Infinity;
  for (const p of precos) {
    const dist = Math.abs(p.area - area);
    if (dist < menorDist) { menorDist = dist; melhor = p; }
  }
  return melhor && menorDist <= 3 ? melhor : null;
}

/** Preço da planta mais próxima dessa área (tolerância de 3m² pra cobrir arredondamento entre PDF e Orulo). */
export function precoManualPorArea(id: string, area: number): number | null {
  return plantaManualPorArea(id, area)?.priceFrom ?? null;
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
