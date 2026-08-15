/**
 * lib/filtro-lotes-fora-sp.ts
 * Fora do estado de SP, exclui loteamentos/terrenos — a Orulo classifica esse
 * tipo de empreendimento com a tipologia "Terreno/Lote Residencial" (campo
 * property_types, vindo de typologies[].type no detalhe do imóvel). O corretor
 * não trabalha com venda de lote/terreno, só empreendimentos de fato (apartamento,
 * casa em condomínio etc.) — sem isso, cidades como Capão da Canoa (RS) e
 * Curitiba (PR) misturavam loteamentos junto com os empreendimentos reais.
 * Dentro do estado de SP não filtra nada: são raríssimos por lá (achado só 1
 * em ~2100 imóveis) e o pedido foi específico pra "outros estados".
 */
export function isLoteForaSP(b: { state?: string | null; property_types?: string[] | null }): boolean {
  if ((b.state || '').toUpperCase() === 'SP') return false;
  return (b.property_types || []).some(t => /lote|terreno/i.test(t));
}

export function filterLotesForaSP<T extends { state?: string | null; property_types?: string[] | null }>(buildings: T[]): T[] {
  return buildings.filter(b => !isLoteForaSP(b));
}
