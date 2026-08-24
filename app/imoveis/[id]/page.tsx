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
import { notFound } from 'next/navigation';
import { kvGetCatalog, type CatalogEntry } from '@/lib/orulo-kv';
import { getToken, fetchBuildingDetail } from '@/lib/orulo-api';
import { temPrecoReal } from '@/lib/filtro-breve-lancamento';
import ImovelDetailClient from './ImovelDetailClient';

const BASE = 'https://www.financiecerto.com.br';

function fmtBRL(v: number | null | undefined): string {
  if (!v) return '';
  return 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

// React cache() — deduplica a busca entre generateMetadata e a página no mesmo request.
// Checa o KV primeiro (rápido — já inclui o ciclo de vida SEO calculado pelo
// sync, ver lib/orulo-kv.ts). Só cai pro fallback ao vivo quando o id nunca
// esteve no catálogo (imóvel genuinamente novo, sync ainda não pegou) — não é
// consultado a cada acesso, só nesse caso raro de cache miss total.
const getBuildingData = cache(async (id: string): Promise<CatalogEntry | null> => {
  try {
    const catalog = await kvGetCatalog();
    const cached = catalog?.find(b => b.id === id);
    if (cached) return cached;
  } catch { /* segue para o fallback ao vivo */ }

  try {
    const token = await getToken();
    return await fetchBuildingDetail(token, id);
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

  // O preço volta a aparecer (é o que mais puxa clique), mas com um qualificador
  // quando há mais de uma tipologia — sem isso, o snippet mostra "a partir de
  // R$X" ao lado de uma faixa de quartos, e quem clica pensando nesse valor pra
  // uma unidade maior se sente enganado ao ver que R$X é só da menor. Com o
  // qualificador, a expectativa já chega certa.
  const temFaixaDeQuartos = b.bedrooms_max != null && b.bedrooms_max !== b.bedrooms_min;
  const priceStr = temPrecoReal(b)
    ? `a partir de ${fmtBRL(b.min_price)}${temFaixaDeQuartos ? ' (unidade menor)' : ''}`
    : null;

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

  // Imóvel não existe mais em lugar nenhum (nem KV, nem Orulo ao vivo) — 404 real,
  // não uma página "vazia" com 200 OK (isso é o que gera soft-404 no Google).
  if (!b) notFound();

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
        // Sem oferta nenhuma pra imóvel confirmado fora do catálogo da Orulo há
        // 30+ dias (ver lib/orulo-kv.ts) — nenhuma disponibilidade real pra
        // declarar, nem OutOfStock (que ainda implica "volta depois").
        ...(temPrecoReal(b) && b.seo_status !== 'removed_confirmed' && {
          offers: {
            '@type': 'Offer',
            price: b.min_price,
            priceCurrency: 'BRL',
            // Reflete o estoque real — sem isso, um empreendimento sem unidades
            // disponíveis (que a própria página já mostra como esgotado) declarava
            // "InStock" pro Google de qualquer forma, um dado estruturado
            // inconsistente com o conteúdo visível da página.
            availability: b.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          },
        }),
        address: {
          '@type': 'PostalAddress',
          // streetAddress só entra quando há logradouro real — sem isso, o bairro
          // era usado como se fosse o endereço (uso errado do campo).
          ...(b.street && { streetAddress: b.street }),
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
