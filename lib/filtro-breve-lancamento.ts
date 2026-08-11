/**
 * lib/filtro-breve-lancamento.ts
 * Antes vivia só dentro de app/api/orulo/route.ts (não podia ser importado de
 * outro lugar — route.ts só pode exportar handlers HTTP). Isso fez o
 * app/sitemap.ts nunca aplicar esse filtro, indexando empreendimentos "Breve
 * Lançamento" sem preço real (a Orulo usa min_price=0.1 como sentinela) e cuja
 * entrega está anos no futuro — exatamente o tipo de página fina/sem conteúdo
 * real que o Google marca como soft-404. Mesma classe de bug do filtro por
 * CIDADES_LIBERADAS: a lógica precisa ser uma única fonte, não duas cópias.
 */

export interface BuildingComPrecoEData {
  min_price?: number | null;
  delivery_date?: string | null;
}

/** Preço abaixo disso é sentinela de "sem tabela publicada", não um preço real. */
const PRECO_MINIMO_REAL = 100;

/** True se o preço é um valor real (não sentinela/placeholder da Orulo). */
export function temPrecoReal(b: BuildingComPrecoEData): boolean {
  return !!(b.min_price && b.min_price >= PRECO_MINIMO_REAL);
}

/**
 * Empreendimento tem conteúdo suficiente pra valer uma página pública indexável:
 * preço real já publicado, OU lançamento confirmado nos próximos 2 meses (aí a
 * falta de preço é temporária, não um problema de conteúdo).
 */
export function temConteudoIndexavel(b: BuildingComPrecoEData): boolean {
  if (temPrecoReal(b)) return true;
  if (!b.delivery_date) return false;
  const launchDate = new Date(b.delivery_date);
  if (isNaN(launchDate.getTime())) return false;
  const now = new Date();
  const twoMonthsAhead = new Date(now);
  twoMonthsAhead.setMonth(twoMonthsAhead.getMonth() + 2);
  return launchDate >= now && launchDate <= twoMonthsAhead;
}

export function filterBreveLancamento<T extends BuildingComPrecoEData>(buildings: T[]): T[] {
  return buildings.filter(temConteudoIndexavel);
}
