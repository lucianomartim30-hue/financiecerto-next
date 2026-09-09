import { CIDADES_LIBERADAS } from '@/lib/cidades-liberadas';
import { filterBreveLancamento, temPrecoReal } from '@/lib/filtro-breve-lancamento';
import { filterLotesForaSP } from '@/lib/filtro-lotes-fora-sp';
import { construtoraToSlug, nomePublicoConstrutora } from '@/lib/construtora-nomes';
import { kvGetCatalog, type CatalogEntry } from '@/lib/orulo-kv';

export const MIN_IMOVEIS_CONSTRUTORA_INDEXAVEL = 3;

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
  photo: string | null;
  status: string;
  status_norm: string;
  delivery_date: string | null;
  updated_at: string | null;
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
}

function catalogoPublico(catalogo: CatalogEntry[]): CatalogEntry[] {
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

function toImovel(b: CatalogEntry): ImovelConstrutora {
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
    photo: b.photo,
    status: b.status,
    status_norm: b.status_norm,
    delivery_date: b.delivery_date,
    updated_at: b.updated_at,
  };
}

export function agruparConstrutoras(catalogo: CatalogEntry[]): GrupoConstrutora[] {
  const grupos = new Map<string, { nome: string; aliases: Set<string>; entradas: CatalogEntry[] }>();

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

  return [...grupos.entries()].map(([slug, grupo]) => {
    const entradas = grupo.entradas.sort((a, b) => {
      const precoA = temPrecoReal(a) ? a.min_price! : Number.MAX_SAFE_INTEGER;
      const precoB = temPrecoReal(b) ? b.min_price! : Number.MAX_SAFE_INTEGER;
      return precoA - precoB || a.name.localeCompare(b.name, 'pt-BR');
    });
    const cidades = [...new Set(entradas.map(b => b.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const bairros = [...new Set(entradas.map(b => b.neighborhood).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const precos = entradas.filter(temPrecoReal).map(b => b.min_price!);
    const atualizacoes = entradas.map(b => b.updated_at).filter((v): v is string => !!v).sort().reverse();
    // Nem todo imóvel da construtora tem developer_logo preenchido (depende do
    // que a Orulo cadastrou naquele building específico) — usa a primeira que
    // aparecer no grupo, já que é a mesma marca pra todos os aliases.
    const logo = entradas.find(b => b.developer_logo)?.developer_logo ?? null;
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
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function getConstrutoras(): Promise<GrupoConstrutora[]> {
  return agruparConstrutoras((await kvGetCatalog()) ?? []);
}

export async function getConstrutora(slug: string): Promise<GrupoConstrutora | null> {
  return (await getConstrutoras()).find(grupo => grupo.slug === slug) ?? null;
}

