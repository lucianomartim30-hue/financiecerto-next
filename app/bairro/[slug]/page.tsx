import { Suspense } from 'react';
import { slugToLocation } from '@/lib/locations';
import BairroContent from './BairroContent';

// Next.js 15+: params e searchParams são Promises
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const loc = slugToLocation(slug);
  return {
    title:       `Imóveis em ${loc.neighborhood}, ${loc.city} | FinancieCerto`,
    description: `Encontre os melhores apartamentos e lançamentos em ${loc.neighborhood}, ${loc.city}. ` +
                 `Compare financiamentos, simule MCMV e descubra imóveis compatíveis com seu perfil financeiro.`,
    openGraph: {
      title:       `Imóveis em ${loc.neighborhood} | FinancieCerto`,
      description: `${loc.neighborhood}, ${loc.city} – apartamentos, studios, lançamentos e financiamento imobiliário.`,
    },
  };
}

export default async function BairroPage({
  params,
  searchParams,
}: {
  params:       Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { slug } = await params;
  const sp       = await searchParams;
  const loc      = slugToLocation(slug);
  re