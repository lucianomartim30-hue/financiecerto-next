import { Suspense } from 'react';
import { slugToLocation } from '@/lib/locations';
import BairroContent from './BairroContent';

export function generateMetadata({ params }: { params: { slug: string } }) {
  const loc = slugToLocation(params.slug);
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

export default function BairroPage({
  params,
  searchParams,
}: {
  params:       { slug: string };
  searchParams: Record<string, string>;
}) {
  const loc = slugToLocation(params.slug);
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)' }} />}>
      <BairroContent location={loc} searchParams={searchParams} />
    </Suspense>
  );
}
