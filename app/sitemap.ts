/**
 * app/sitemap.ts
 * Sitemap dinâmico gerado pelo Next.js App Router.
 * Inclui páginas estáticas + todas as páginas de imóveis do catálogo KV.
 * Acessível em: https://www.financiecerto.com.br/sitemap.xml
 */

import { MetadataRoute } from 'next';
import { kvGetCatalog } from '@/lib/orulo-kv';
import { neighborhoodToSlug } from '@/lib/locations';

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
  ];

  // ── Páginas dinâmicas de imóveis + bairros ────────────────────────────────
  let buildingPages: MetadataRoute.Sitemap = [];
  let bairroPages:   MetadataRoute.Sitemap = [];
  try {
    const catalog = await kvGetCatalog();
    if (catalog && catalog.length > 0) {
      // Páginas individuais de imóvel
      buildingPages = catalog.map(b => ({
        url:             `${BASE}/imoveis/${b.id}`,
        lastModified:    safeIso(b.updated_at, now),
        changeFrequency: 'weekly' as const,
        priority:        0.7,
      }));

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

  return [...staticPages, ...buildingPages, ...bairroPages];
}
