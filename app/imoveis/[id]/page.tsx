/**
 * app/imoveis/[id]/page.tsx  — Server Component
 *
 * Responsabilidades:
 *  1. generateMetadata  → <title>, <meta description>, Open Graph, Twitter Card
 *  2. Schema.org JSON-LD → RealEstateListing + BreadcrumbList (rich snippets)
 *  3. Renderiza ImovelDetailClient (toda a UI interativa)
 *
 * Dados para metadata vêm do catálogo KV (< 10 ms, sem chamar a Orulo).
 * Se o imóvel não estiver no KV ainda, usa fallback genérico.
 */

import type { Metadata } from 'next';
import { cache } from 'react';
import { kvGetCatalog } from '@/lib/orulo-kv';
import ImovelDetailClient from './ImovelDetailClient';

const BASE = 'https://www.financiecerto.com.br';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number | null | undefined): string {
  if (!v) return '';
  return 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

// React cache() — deduplica a busca KV dentro do mesmo request
// (generateMetadata e a função page chamam getBuildingData com o mesmo id)
const getBuildingData = cache(async (id: string) => {
  try {
    const catalog = await kvGetCatalog();
    return catalog?.find(b => b.id === id) ?? null;
  } catch {
    return null;
  }
});

// ── generateMetadata ─────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const b = await getBuildingData(id);

  if (!b) {
    return {
      title: 'Imóvel | FinancieCerto',
      description:
        'Encontre seu imóvel ideal e simule seu financiamento no FinancieCerto.',
    };
  }

  // ── Partes textuais ──
  const bedroomStr =
    b.bedrooms_min != null
      ? b.bedrooms_max && b.bedrooms_max !== b.bedrooms_min
        ? `${b.bedrooms_min} a ${b.bedrooms_max} quartos`
        : `${b.bedrooms_min} quarto${b.bedrooms_min !== 1 ? 's' : ''}`
      : null;

  const areaStr =
    b.area_min
      ? b.area_max && b.area_max !== b.area_min
        ? `${b.area_min}–${b.area_max} m²`
        : `${b.area_min} m²`
      : null;

  const priceStr = b.min_price ? `a partir de ${fmtBRL(b.min_price)}` : null;

  // ── Title ──
  const suffix = [bedroomStr, priceStr].filter(Boolean).join(', ');
  const title = suffix
    ? `${b.name} — ${suffix} | FinancieCerto`
    : `${b.name} | FinancieCerto`;

  // ── Description ──
  const descParts = [
    `${b.name} da ${b.developer} em ${b.neighborhood}, ${b.city}`,
    [bedroomStr, areaStr, priceStr].filter(Boolean).join(', '),
    'Simule o financiamento e descubra se você tem perfil para comprar este imóvel.',
  ].filter(Boolean);
  const description = descParts.join('. ');

  const url   = `${BASE}/imoveis/${id}`;
  const image = b.photo ?? `${BASE}/og-default.png`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'FinancieCerto',
      images: [{ url: image, width: 1200, height: 628, alt: b.name }],
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ImovelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const b = await getBuildingData(id);

  // ── Schema.org: RealEstateListing ──
  const listingSchema = b
    ? {
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: b.name,
        description: [
          `${b.name} da ${b.developer}`,
          `em ${b.neighborhood}, ${b.city}`,
          b.bedrooms_min != null
            ? `${b.bedrooms_min}${b.bedrooms_max && b.bedrooms_max !== b.bedrooms_min ? `–${b.bedrooms_max}` : ''} quartos`
            : null,
          b.area_min ? `${b.area_min}${b.area_max && b.area_max !== b.area_min ? `–${b.area_max}` : ''} m²` : null,
        ]
          .filter(Boolean)
          .join(', '),
        url: `${BASE}/imoveis/${id}`,
        image: b.photo ?? undefined,
        ...(b.min_price && {
          offers: {
            '@type': 'Offer',
            price: b.min_price,
            priceCurrency: 'BRL',
            availability: 'https://schema.org/InStock',
          },
        }),
        address: {
          '@type': 'PostalAddress',
          streetAddress: b.neighborhood,
          addressLocality: b.city,
          addressRegion: b.state,
          addressCountry: 'BR',
        },
        ...(b.bedrooms_min != null && { numberOfRooms: b.bedrooms_min }),
        ...(b.area_min && {
          floorSize: {
            '@type': 'QuantitativeValue',
            value: b.area_min,
            unitCode: 'MTK',
          },
        }),
      }
    : null;

  // ── Schema.org: BreadcrumbList ──
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início',  item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Imóveis', item: `${BASE}/imoveis` },
      { '@type': 'ListItem', position: 3, name: b?.name ?? 'Imóvel', item: `${BASE}/imoveis/${id}` },
    ],
  };

  return (
    <>
      {/* JSON-LD — injetado no <head> pelo Next.js */}
      {listingSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(listingSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* UI interativa (client component) */}
      <ImovelDetailClient id={id} />
    </>
  );
}
