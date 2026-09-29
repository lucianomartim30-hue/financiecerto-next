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
  /** Total de unidades dessa planta no empreendimento (contagem por final na tabela de preços/mapa de disponibilidade). */
  units?: number;
  /** Unidades ainda disponíveis (verde no mapa de disponibilidade da construtora) — sem isso, mostra só o total. */
  disponiveis?: number;
}

export const PRECOS_MANUAIS: Record<string, PrecoManualPlanta[]> = {
  // Oásis Santa Cruz by Diálogo (id 83507) — tabela de pré-lançamento set/2026
  // (JD House/Diálogo). Preço = menor "Valor Total do Negócio" de cada planta.
  // Unidades/disponíveis = contagem célula a célula no mapa de disponibilidade
  // (verde = livre) cruzado com os "finais" de cada planta na própria tabela
  // de preços, 2026-09-28. Os finais 3 e 12 mudam de produto por andar: até o
  // 6º andar são o studio de 26,27m² (tabela: "Finais 3 e 12 (STD-26,27m²) 3º
  // ao 5º Pav + unid 603"), só viram o apto de 44,99m² a partir do 8º andar —
  // o 7º andar não tem linha própria na tabela; tratado aqui como studio
  // (mesmo grupo do 6º) por ser o lado mais próximo do texto explícito.
  '83507': [
    // 1 dorm 32m² + studios (26,27-27,97m²): a ficha técnica junta essa faixa
    // toda como "26m² a 32m²" — usamos o mesmo agrupamento aqui.
    { area: 32, priceFrom: 358000, units: 110, disponiveis: 68 },  // Planta 01 — 1 dorm 32m² (finais 4/5/6/11) + studios (finais 2/13 todos andares, 3/12 até o 7º andar)
    { area: 45, priceFrom: 505000, units: 82, disponiveis: 64 },   // Planta 01 — 2 dorms 45m² (finais 7/10 todos andares + 3/12 do 8º andar em diante — 44,99/45,01m²) — HMP
    { area: 59, priceFrom: 775000, units: 91, disponiveis: 74 },   // Planta 03 — 2 dorms 59m² (finais 1/14 — 59,16m² + 8/9 — 59,45m²) — Residencial
    { area: 69, priceFrom: 845000, units: 112, disponiveis: 97 },  // Planta 04 — 2 dorms 69m² (Torre 2, finais 3/4/7/8 — 69,86m²) — Residencial
    { area: 97, priceFrom: 1173000, units: 112, disponiveis: 93 }, // Planta 05 — 3 dorms 97m² (Torre 2, finais 1/2/5/6, sem a cobertura do 31º andar — 97,52m²) — Residencial
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
