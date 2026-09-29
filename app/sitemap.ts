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
import { ZONA_SUL_OESTE, normalize } from '@/lib/imoveis-destaque';
import { agruparConstrutoras } from '@/lib/construtoras-catalogo';
import { catalogoComManuais } from '@/lib/lancamentos-manuais';
import { catalogoPublicoParaBairros } from '@/lib/bairros-validos';

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
    { url: `${BASE}/imoveis/minha-casa-minha-vida`, lastModified: now, changeFrequency: 'hourly', priority: 0.85 },
    { url: `${BASE}/construtoras`,         lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
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
  const bairroPages: MetadataRoute.Sitemap = [];
  let construtoraPages: MetadataRoute.Sitemap = [];
  try {
    const kvCatalog = await kvGetCatalog();
    // Empreendimentos cadastrados manualmente (ver lib/lancamentos-manuais.ts)
    // entram no sitemap pelas mesmas regras de qualquer imóvel — inclusive o
    // filtro de conteúdo indexável logo abaixo.
    const rawCatalog = catalogoComManuais(kvCatalog ?? []);
    if (rawCatalog) {
      construtoraPages = agruparConstrutoras(rawCatalog)
        .filter(construtora => construtora.indexavel)
        .map(construtora => ({
          url: `${BASE}/construtoras/${construtora.slug}`,
          lastModified: safeIso(construtora.ultimaAtualizacao, now),
          changeFrequency: 'daily' as const,
          priority: 0.75,
        }));
    }
    // Mesmo filtro usado por app/bairro/[slug]/page.tsx pra decidir 404 —
    // fonte única, ver lib/bairros-validos.ts (só cidades liberadas, sem
    // imóvel sumido, sem "breve lançamento" sem tabela, sem lote fora de SP).
    const catalog = await catalogoPublicoParaBairros();
    if (catalog.length > 0) {
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

  return [...staticPages, ...regionPages, ...artigoPages, ...construtoraPages, ...buildingPages, ...bairroPages];
}
