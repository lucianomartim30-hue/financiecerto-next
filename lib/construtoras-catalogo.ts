import { CIDADES_LIBERADAS } from '@/lib/cidades-liberadas';
import { filterBreveLancamento, temPrecoReal } from '@/lib/filtro-breve-lancamento';
import { filterLotesForaSP } from '@/lib/filtro-lotes-fora-sp';
import { construtoraToSlug, nomePublicoConstrutora } from '@/lib/construtora-nomes';
import { kvGetCatalog, type CatalogEntry } from '@/lib/orulo-kv';
import { LOGOS_MANUAIS } from '@/lib/construtora-logos-manuais';
import { kvGetTodasPromocoesPublicas, type Promocao } from '@/lib/promocoes-kv';

export const MIN_IMOVEIS_CONSTRUTORA_INDEXAVEL = 3;

// A mesma entrada do catálogo usada por app/api/orulo/route.ts pro portal,
// só que aqui com a promoção manual (lib/promocoes-kv.ts) já mesclada — sem
// isso, o card da página de construtora nunca sabia de promoção nenhuma,
// porque esse mesclamento só acontecia dentro da rota de API do portal.
type CatalogEntryComPromo = CatalogEntry & { promocoes_destaque?: Promocao[] };

export interface ImovelConstrutora {
  id: string;
  name: string;
  developer: string;
  developer_logo: string | null;
  min_price: number | null;
  bedrooms_min: number | null;
  bedrooms_max: number | null;
  area_min: number | null;
  area_max: number | null;
  vagas_min: number | null;
  vagas_max: number | null;
  neighborhood: string;
  city: string;
  state: string;
  street: string;
  photo: string | null;
  status: string;
  status_norm: string;
  delivery_date: string | null;
  updated_at: string | null;
  promocoes_destaque: Promocao[];
}
export interface GrupoConstrutora {
  slug: string;
  nome: string;
  aliases: string[];
  logo: string | null;
  imoveis: ImovelConstrutora[];
  cidades: string[];
  bairros: string[];
  menorPreco: number | null;
  ultimaAtualizacao: string | null;
  indexavel: boolean;
  /** Nível de destaque visual na home de construtoras (1 = maior). Não tem
   * nenhum efeito em indexação — isso continua controlado só por `indexavel`. */
  destaque: 1 | 2 | 3 | null;
}

// Construtoras de altíssimo padrão que entram no nível 2 de destaque mesmo
// quando o volume de empreendimentos ativos as deixaria fora do ranking —
// reconhecimento de marca aqui pesa mais que quantidade.
const DESTAQUE_TIER2_FORCADO = new Set(['lindenberg', 'rfm-incorporadora']);

function catalogoPublico(catalogo: CatalogEntryComPromo[]): CatalogEntryComPromo[] {
  let filtrado = catalogo.filter(b =>
    !!b.developer?.trim()
    && CIDADES_LIBERADAS.has((b.city || '').toLowerCase().trim())
    && b.seo_status !== 'suspected_missing'
    && b.seo_status !== 'removed_confirmed'
    && b.finality_norm !== 'comercial'
  );
  filtrado = filterBreveLancamento(filtrado);
  return filterLotesForaSP(filtrado);
}

function toImovel(b: CatalogEntryComPromo): ImovelConstrutora {
  return {
    id: b.id,
    name: b.name,
    developer: b.developer,
    developer_logo: b.developer_logo ?? null,
    min_price: b.min_price,
    bedrooms_min: b.bedrooms_min,
    bedrooms_max: b.bedrooms_max,
    area_min: b.area_min,
    area_max: b.area_max,
    vagas_min: b.vagas_min,
    vagas_max: b.vagas_max,
    neighborhood: b.neighborhood,
    city: b.city,
    state: b.state,
    street: b.street,
    photo: b.photo,
    status: b.status,
    status_norm: b.status_norm,
    delivery_date: b.delivery_date,
    updated_at: b.updated_at,
    promocoes_destaque: b.promocoes_destaque ?? [],
  };
}

export function agruparConstrutoras(catalogo: CatalogEntryComPromo[]): GrupoConstrutora[] {
  const grupos = new Map<string, { nome: string; aliases: Set<string>; entradas: CatalogEntryComPromo[] }>();

  for (const entrada of catalogoPublico(catalogo)) {
    const slug = construtoraToSlug(entrada.developer);
    if (!slug) continue;
    const nome = nomePublicoConstrutora(entrada.developer);
    const existente = grupos.get(slug);
    if (existente) {
      existente.aliases.add(entrada.developer.trim());
      existente.entradas.push(entrada);
    } else {
      grupos.set(slug, { nome, aliases: new Set([entrada.developer.trim()]), entradas: [entrada] });
    }
  }

  const construtoras = [...grupos.entries()].map(([slug, grupo]) => {
    const entradas = grupo.entradas.sort((a, b) => {
      const precoA = temPrecoReal(a) ? a.min_price! : Number.MAX_SAFE_INTEGER;
      const precoB = temPrecoReal(b) ? b.min_price! : Number.MAX_SAFE_INTEGER;
      return precoA - precoB || a.name.localeCompare(b.name, 'pt-BR');
    });
    const cidades = [...new Set(entradas.map(b => b.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const bairros = [...new Set(entradas.map(b => b.neighborhood).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const precos = entradas.filter(temPrecoReal).map(b => b.min_price!);
    const atualizacoes = entradas.map(b => b.updated_at).filter((v): v is string => !!v).sort().reverse();
    // A Orulo não manda developer_logo pra nenhuma construtora (campo sempre
    // null na API, confirmado em 2026-09-10) — prioriza a logo baixada
    // manualmente do site oficial; o campo da Orulo fica como fallback caso
    // ela passe a preencher isso no futuro.
    const logo = LOGOS_MANUAIS[slug] ?? entradas.find(b => b.developer_logo)?.developer_logo ?? null;
    return {
      slug,
      nome: grupo.nome,
      aliases: [...grupo.aliases].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      logo,
      imoveis: entradas.map(toImovel),
      cidades,
      bairros,
      menorPreco: precos.length ? Math.min(...precos) : null,
      ultimaAtualizacao: atualizacoes[0] ?? null,
      indexavel: entradas.length >= MIN_IMOVEIS_CONSTRUTORA_INDEXAVEL && precos.length > 0,
    };
  });

  // Destaque: ranking por volume de empreendimentos entre as indexáveis — só
  // afeta ordem/visual na home de construtoras, nunca indexação.
  const rankeadas = construtoras
    .filter(c => c.indexavel)
    .sort((a, b) => b.imoveis.length - a.imoveis.length || a.nome.localeCompare(b.nome, 'pt-BR'));

  const destaquePorSlug = new Map<string, 1 | 2 | 3>();
  rankeadas.forEach((c, i) => {
    const posicao = i + 1;
    if (posicao <= 15) destaquePorSlug.set(c.slug, 1);
    else if (posicao <= 50) destaquePorSlug.set(c.slug, 2);
    else if (posicao <= 100) destaquePorSlug.set(c.slug, DESTAQUE_TIER2_FORCADO.has(c.slug) ? 2 : 3);
  });
  for (const slug of DESTAQUE_TIER2_FORCADO) {
    if (!destaquePorSlug.has(slug)) destaquePorSlug.set(slug, 2);
  }

  return construtoras
    .map(c => ({ ...c, destaque: destaquePorSlug.get(c.slug) ?? null }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    // Segundo sort (estável): traz as destacadas pro topo, ordenadas por
    // nível e depois por volume; as sem destaque mantêm a ordem alfabética
    // que já vem do sort acima (retornar 0 preserva a posição relativa).
    .sort((a, b) => {
      if (a.destaque && b.destaque) {
        return a.destaque - b.destaque || b.imoveis.length - a.imoveis.length;
      }
      if (a.destaque && !b.destaque) return -1;
      if (!a.destaque && b.destaque) return 1;
      return 0;
    });
}

export async function getConstrutoras(): Promise<GrupoConstrutora[]> {
  const catalogo = (await kvGetCatalog()) ?? [];
  const promocoes = await kvGetTodasPromocoesPublicas();
  const comPromo: CatalogEntryComPromo[] = Object.keys(promocoes).length === 0
    ? catalogo
    : catalogo.map(b => promocoes[b.id] ? { ...b, promocoes_destaque: promocoes[b.id] } : b);
  return agruparConstrutoras(comPromo);
}

export async function getConstrutora(slug: string): Promise<GrupoConstrutora | null> {
  return (await getConstrutoras()).find(grupo => grupo.slug === slug) ?? null;
}

