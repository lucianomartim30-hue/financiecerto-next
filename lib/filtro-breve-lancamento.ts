/**
 * lib/filtro-breve-lancamento.ts
 * Antes vivia só dentro de app/api/orulo/route.ts (não podia ser importado de
 * outro lugar — route.ts só pode exportar handlers HTTP). Isso fez o
 * app/sitemap.ts nunca aplicar esse filtro, indexando empreendimentos "Breve
 * Lançamento" sem preço real (a Orulo usa min_price=0.1 como sentinela) e cuja
 * entrega está anos no futuro — exatamente o tipo de página fina/sem conteúdo
 * real que o Google marca como soft-404 (370 páginas penalizadas em ago/2026).
 * Mesma classe de bug do filtro por CIDADES_LIBERADAS: a lógica precisa ser
 * uma única fonte, não duas cópias.
 *
 * Atualização (auditoria 2026-09): o problema de agosto não era "breve
 * lançamento não pode ser indexado" — era a página mostrar "R$ 0" (sentinela
 * quebrado) com pouco mais que isso. Portais grandes (ZAP, VivaReal) e sites
 * de incorporadora (Trisul) indexam normalmente imóveis sem preço ("sob
 * consulta"/"breve lançamento") DESDE QUE a página tenha conteúdo real —
 * fotos, descrição, comodidades — não um título com R$ 0 e nada mais. Por
 * isso o critério agora inclui "tem foto real", que é o proxy mais forte de
 * "página com conteúdo" disponível no nível do catálogo (sitemap não tem
 * acesso a amenities/descrição, só ao resumo do CatalogEntry).
 */

export interface BuildingComPrecoEData {
  min_price?: number | null;
  delivery_date?: string | null;
  photo?: string | null;
}

/** Preço abaixo disso é sentinela de "sem tabela publicada", não um preço real. */
const PRECO_MINIMO_REAL = 100;

/** True se o preço é um valor real (não sentinela/placeholder da Orulo). */
export function temPrecoReal(b: BuildingComPrecoEData): boolean {
  return !!(b.min_price && b.min_price >= PRECO_MINIMO_REAL);
}

/**
 * Empreendimento tem conteúdo suficiente pra valer uma página pública indexável:
 * preço real já publicado, OU tem foto real (a página não é um shell vazio,
 * mesmo sem preço — mesmo padrão que ZAP/VivaReal/sites de incorporadora
 * usam pra "sob consulta"/"breve lançamento"), OU lançamento/entrega
 * confirmado nos próximos 2 meses (a falta de preço é temporária).
 */
export function temConteudoIndexavel(b: BuildingComPrecoEData): boolean {
  if (temPrecoReal(b)) return true;
  if (b.photo) return true;
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
