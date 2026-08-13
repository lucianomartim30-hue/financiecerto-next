/**
 * lib/imoveis-destaque.ts
 * Seleção de imóveis para a seção de destaque da home — hoje focada em Zona
 * Sul e Zona Oeste de SP (o público que o corretor mais quer atender), pra
 * dar a esses empreendimentos mais link interno (sinal de relevância pro
 * Google) e mais visibilidade real pra quem visita o site.
 */

import { kvGetCatalog } from './orulo-kv';
import { filterBreveLancamento, temPrecoReal } from './filtro-breve-lancamento';
import { REGIONS } from './regions';

export interface ImovelDestaque {
  id: string;
  name: string;
  neighborhood: string;
  min_price: number | null;
  max_price: number | null;
  photo: string | null;
  status_norm: string;
}

export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export const ZONA_SUL_OESTE = new Set(
  [
    ...(REGIONS.find(r => r.slug === 'zona-sul-sp')?.neighborhoods ?? []),
    ...(REGIONS.find(r => r.slug === 'zona-oeste-sp')?.neighborhoods ?? []),
    ...(REGIONS.find(r => r.slug === 'centro-sp')?.neighborhoods ?? []),
  ].map(normalize),
);

export async function getImoveisDestaque(limit = 6): Promise<ImovelDestaque[]> {
  try {
    const catalog = await kvGetCatalog();
    if (!catalog || catalog.length === 0) return [];

    let picks = catalog.filter(b =>
      normalize(b.city || '') === 'sao paulo' &&
      ZONA_SUL_OESTE.has(normalize(b.neighborhood || '')) &&
      !!b.photo,
    );
    picks = filterBreveLancamento(picks).filter(temPrecoReal);
    picks.sort((a, b) => (b.min_price ?? 0) - (a.min_price ?? 0));

    return picks.slice(0, limit).map(b => ({
      id: b.id,
      name: b.name,
      neighborhood: b.neighborhood,
      min_price: b.min_price,
      max_price: b.max_price,
      photo: b.photo,
      status_norm: b.status_norm,
    }));
  } catch {
    return [];
  }
}
