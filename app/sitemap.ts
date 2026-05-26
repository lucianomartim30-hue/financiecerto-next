/**
 * app/sitemap.ts
 * Sitemap dinâmico gerado pelo Next.js App Router.
 * Inclui páginas estáticas + todas as páginas de imóveis do catálogo KV.
 * Acessível em: https://www.financiecerto.com.br/sitemap.xml
 */

import { MetadataRoute } from 'next';
import { kvGetCatalog } from '@/lib/orulo-kv';

const BASE = 'https://www.financiecerto.com.br';

export const dynamic = 'force-dynamic';

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

  // ── Páginas dinâmicas de imóveis ──────────────────────────────────────────
  let buildingPages: MetadataRoute.Sitemap = [];
  try {
    const catalog = await kvGetCatalog();
    if (catalog && catalog.length > 0) {
      buildingPages = catalog.map(b => ({
        url:             `${BASE}/imoveis/${b.id}`,
        lastModified:    b.updated_at ?? now,
        changeFrequency: 'weekly' as const,
        priority:        0.7,
      }));
    }
  } catch {
    // KV indisponível — retorna só as páginas estáticas
  }

  return [...staticPages, ...buildingPages];
}
