/**
 * app/sitemap.ts
 * Sitemap dinâmico gerado pelo Next.js App Router.
 * Inclui páginas estáticas + todas as páginas de imóveis do catálogo KV.
 * Acessível em: https://www.financiecerto.com.br/sitemap.xml
 */

import { MetadataRoute } from 'next';
import { kvGetCatalog } from '@/lib/orulo-kv';
import { neighborhoodToSlug } from '@/lib/locations';
import { getArtigos } from '@/lib/artigos';
import { REGIONS } from '@/lib/regions';
import { CIDADES_LIBERADAS } from '@/lib/cidades-liberadas';
import { filterBreveLancamento } from '@/lib/filtro-breve-lancamento';
import { filterLotesForaSP } from '@/lib/filtro-lotes-fora-sp';
import { ZONA_SUL_OESTE, normalize } from '@/lib/imoveis-destaque';

const BASE = 'https://www.financiecerto.com.br';

export const dynamic = 'force-dynamic';

/** Converte qualquer valor de data para ISO 8601 válido, ou retorna fallback. */
function safeIso(val: string | null | undefined, fallback: string): string {
  if (!val) return fallback;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    return d.toISOString();
  } catch {
    return fallback;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  // ── Páginas estáticas ─────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                          lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/imoveis`,             lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE}/simulador`,           lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/simulador/na-planta`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/guia`,                lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/glossario`,           lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/aprenda`,             lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
  ];

  // ── Páginas de região (zonas de São Paulo) ────────────────────────────────
  const regionPages: MetadataRoute.Sitemap = REGIONS.map(r => ({
    url:             `${BASE}/regiao/${r.slug}`,
    lastModified:    now,
    changeFrequency: 'hourly' as const,
    priority:        0.85,
  }));

  // ── Artigos do hub /aprenda ───────────────────────────────────────────────
  const artigoPages: MetadataRoute.Sitemap = getArtigos().map(a => ({
    url:             `${BASE}/aprenda/${a.slug}`,
    lastModified:    safeIso(a.atualizado, now),
    changeFrequency: 'monthly' as const,
    priority:        0.8,
  }));

  // ── Páginas dinâmicas de imóveis + bairros ────────────────────────────────
  let buildingPages: MetadataRoute.Sitemap = [];
  let bairroPages:   MetadataRoute.Sitemap = [];
  try {
    const rawCatalog = await kvGetCatalog();
    // O KV guarda o catálogo nacional bruto (todas as cidades ativas na Orulo,
    // mesmo as nunca liberadas no site). Sem este filtro o sitemap submete ao
    // Google imóveis e bairros de cidades que não aparecem em nenhuma busca do
    // site — páginas fantasma, indexadas como soft-404 (ex: bairro de Goiânia).
    let catalog = rawCatalog?.filter(b => CIDADES_LIBERADAS.has((b.city || '').toLowerCase().trim()));
    // Empreendimentos "Breve Lançamento" sem tabela de preço publicada (a Orulo
    // usa min_price=0.1 como sentinela) e sem entrega prevista nos próximos 2
    // meses viram páginas sem conteúdo real — mesmo filtro já aplicado na
    // listagem pública (/api/orulo), só que o sitemap usava o catálogo bruto e
    // por isso indexava exatamente esse tipo de página fina como soft-404.
    if (catalog) catalog = filterBreveLancamento(catalog);
    // Fora do estado de SP, não indexa loteamentos/terrenos — só empreendimentos
    // de verdade (ver lib/filtro-lotes-fora-sp.ts).
    if (catalog) catalog = filterLotesForaSP(catalog);
    if (catalog && catalog.length > 0) {
      // Páginas individuais de imóvel — prioridade maior pra Zona Sul/Oeste de SP
      // (foco comercial do corretor): sinaliza pro Google que esses imóveis
      // importam mais do que a média do catálogo.
      buildingPages = catalog.map(b => {
        const emFoco = normalize(b.city || '') === 'sao paulo' && ZONA_SUL_OESTE.has(normalize(b.neighborhood || ''));
        return {
          url:             `${BASE}/imoveis/${b.id}`,
          lastModified:    safeIso(b.updated_at, now),
          changeFrequency: 'weekly' as const,
          priority:        emFoco ? 0.85 : 0.7,
        };
      });

      // Páginas de bairro — uma por bairro único do catálogo
      const slugsSeen = new Set<string>();
      for (const b of catalog) {
        if (!b.neighborhood || !b.state) continue;
        const slug = neighborhoodToSlug(b.neighborhood, b.state);
        if (!slugsSeen.has(slug)) {
          slugsSeen.add(slug);
          bairroPages.push({
            url:             `${BASE}/bairro/${slug}`,
            lastModified:    now,
            changeFrequency: 'weekly' as const,
            priority:        0.6,
          });
        }
      }
    }
  } catch {
    // KV indisponível — retorna só as páginas estáticas
  }

  return [...staticPages, ...regionPages, ...artigoPages, ...buildingPages, ...bairroPages];
}
