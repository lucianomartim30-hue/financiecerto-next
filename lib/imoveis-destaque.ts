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
import { inferFinalityFromName } from './orulo-api';

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
      b.finality_norm !== 'comercial' &&
      // A Orulo às vezes marca unidade não-residencial (ex: "- NR" no nome)
      // como finality "Residencial" por erro de cadastro — confia primeiro
      // no campo, mas confere o nome de novo aqui como segunda checagem,
      // independente do que a API já decidiu.
      inferFinalityFromName(b.name, b.developer) !== 'comercial' &&
      !!b.photo,
    );
    picks = filterBreveLancamento(picks).filter(temPrecoReal);
    picks.sort((a, b) => (a.min_price ?? 0) - (b.min_price ?? 0));

    // Amostragem espalhada pela faixa de preço (não só os mais caros nem só
    // os mais baratos) — pega posições distribuídas ao longo da lista já
    // ordenada, pra mostrar variedade real de padrão na vitrine da home.
    const n = picks.length;
    const chosen: typeof picks = [];
    if (n <= limit) {
      chosen.push(...picks);
    } else {
      for (let i = 0; i < limit; i++) {
        const idx = Math.floor(((i + 0.5) / limit) * n);
        chosen.push(picks[Math.min(idx, n - 1)]);
      }
    }

    return chosen.map(b => ({
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
