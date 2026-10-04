/**
 * Listas de imóveis/bairros/construtoras montadas no SERVIDOR pra páginas de
 * listagem que são client-side (vitrine, bairro, região). O Google recebia essas
 * páginas quase vazias (350–1.200 caracteres) e sem links pros imóveis: o
 * conteúdo só existia depois do JavaScript. Tudo aqui é complementar — se o
 * catálogo não puder ser lido, devolve vazio e a página segue funcionando.
 */
import type { CatalogEntry } from '@/lib/orulo-kv';
import { catalogoPublicoParaBairros } from '@/lib/bairros-validos';
import { temPrecoReal } from '@/lib/filtro-breve-lancamento';
import { neighborhoodToSlug, slugToLocation } from '@/lib/locations';
import { normalize } from '@/lib/imoveis-destaque';
import type { Region } from '@/lib/regions';
import { getConstrutoras } from '@/lib/construtoras-catalogo';

const SEM_PRECO = Number.MAX_SAFE_INTEGER;

function porPreco(a: CatalogEntry, b: CatalogEntry): number {
  const pa = temPrecoReal(a) ? a.min_price! : SEM_PRECO;
  const pb = temPrecoReal(b) ? b.min_price! : SEM_PRECO;
  return pa - pb || a.name.localeCompare(b.name, 'pt-BR');
}

async function catalogoPublico(): Promise<CatalogEntry[]> {
  try {
    return await catalogoPublicoParaBairros();
  } catch {
    return [];
  }
}

export async function imoveisDoBairro(slug: string, limite = 60): Promise<CatalogEntry[]> {
  const catalogo = await catalogoPublico();
  return catalogo
    .filter(b => b.neighborhood && b.state && neighborhoodToSlug(b.neighborhood, b.state) === slug)
    .sort(porPreco)
    .slice(0, limite);
}

export async function imoveisDaRegiao(region: Region, limite = 60): Promise<CatalogEntry[]> {
  const catalogo = await catalogoPublico();
  const cidades = new Set((region.cities?.length ? region.cities : [region.city]).map(normalize));
  const bairros = new Set(region.neighborhoods.map(normalize));
  return catalogo
    .filter(b => {
      if (!cidades.has(normalize(b.city || ''))) return false;
      return region.cities?.length || bairros.size === 0 ? true : bairros.has(normalize(b.neighborhood || ''));
    })
    .sort(porPreco)
    .slice(0, limite);
}

export interface HubLink { href: string; texto: string; qtd: number }

/** Bairros (só estados com página de bairro) com mais imóveis públicos. */
export async function bairrosMaisImoveis(limite = 48): Promise<HubLink[]> {
  const catalogo = await catalogoPublico();
  const contagem = new Map<string, { texto: string; qtd: number }>();
  for (const b of catalogo) {
    if (!b.neighborhood || !b.state) continue;
    const slug = neighborhoodToSlug(b.neighborhood, b.state);
    if (!slugToLocation(slug).city) continue;
    const atual = contagem.get(slug);
    if (atual) atual.qtd++;
    else contagem.set(slug, { texto: `${b.neighborhood}${b.state ? ` (${b.state})` : ''}`, qtd: 1 });
  }
  return [...contagem.entries()]
    .map(([slug, v]) => ({ href: `/bairro/${slug}`, texto: v.texto, qtd: v.qtd }))
    .sort((a, b) => b.qtd - a.qtd || a.texto.localeCompare(b.texto, 'pt-BR'))
    .slice(0, limite);
}

/** Construtoras indexáveis com mais empreendimentos. */
export async function construtorasMaisImoveis(limite = 36): Promise<HubLink[]> {
  try {
    return (await getConstrutoras())
      .filter(c => c.indexavel)
      .sort((a, b) => b.imoveis.length - a.imoveis.length || a.nome.localeCompare(b.nome, 'pt-BR'))
      .slice(0, limite)
      .map(c => ({ href: `/construtoras/${c.slug}`, texto: c.nome, qtd: c.imoveis.length }));
  } catch {
    return [];
  }
}
