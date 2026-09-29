/**
 * lib/bairros-validos.ts
 *
 * Fonte única pra decidir se um bairro tem conteúdo real no site — usada pelo
 * sitemap (pra listar só bairros com imóvel de verdade) e por
 * app/bairro/[slug]/page.tsx (pra devolver 404 de verdade em vez de uma
 * página vazia com status 200).
 *
 * Antes de existir isso, `slugToLocation` (lib/locations.ts) aceitava
 * QUALQUER slug terminado em "-sp"/"-pr" sem checar se o bairro existe ou tem
 * imóvel — cada slug inventado virava uma página real, renderizada com
 * "Nenhum imóvel encontrado" mas HTTP 200. O Google Search Console flagrou
 * isso como "Erro soft 404" (auditoria 2026-09-29, 383 páginas — a maioria
 * bairros de PR/SP sem estoque atual, e mais ~590 nas filas "detectada" /
 * "rastreada, mas não indexada", incluindo bairros de estados nem sequer
 * liberados no site como SC/RJ/RS que sobreviveram de sitemaps antigos).
 */
import { cache } from 'react';
import { kvGetCatalog, type CatalogEntry } from '@/lib/orulo-kv';
import { catalogoComManuais } from '@/lib/lancamentos-manuais';
import { CIDADES_LIBERADAS } from '@/lib/cidades-liberadas';
import { filterBreveLancamento } from '@/lib/filtro-breve-lancamento';
import { filterLotesForaSP } from '@/lib/filtro-lotes-fora-sp';
import { neighborhoodToSlug } from '@/lib/locations';

/**
 * Catálogo filtrado pelas mesmas regras do portal público: só cidades
 * liberadas, sem imóveis com ausência suspeita/confirmada, sem "breve
 * lançamento" sem tabela publicada, sem lotes fora de SP.
 */
export async function catalogoPublicoParaBairros(): Promise<CatalogEntry[]> {
  const kvCatalog = await kvGetCatalog();
  let catalog: CatalogEntry[] = catalogoComManuais(kvCatalog ?? []);
  catalog = catalog.filter(b => CIDADES_LIBERADAS.has((b.city || '').toLowerCase().trim()));
  catalog = catalog.filter(b => b.seo_status !== 'suspected_missing' && b.seo_status !== 'removed_confirmed');
  catalog = filterBreveLancamento(catalog);
  catalog = filterLotesForaSP(catalog);
  return catalog;
}

/**
 * Slugs de bairro (ex.: "vila-madalena-sp") que têm pelo menos 1 imóvel
 * indexável hoje. `cache()` deduplica a busca entre generateMetadata e a
 * página no mesmo request (mesmo padrão de app/imoveis/[id]/page.tsx).
 */
export const bairroSlugsValidos = cache(async (): Promise<Set<string>> => {
  const catalog = await catalogoPublicoParaBairros();
  const slugs = new Set<string>();
  for (const b of catalog) {
    if (!b.neighborhood || !b.state) continue;
    slugs.add(neighborhoodToSlug(b.neighborhood, b.state));
  }
  return slugs;
});
