import { notFound } from "next/navigation";
import { slugToLocation } from "@/lib/locations";
import BairroContent from "./BairroContent";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const loc = slugToLocation(slug);
  if (!loc.city) return {};
  return {
    title: `Imóveis em ${loc.neighborhood}, ${loc.city} | FinancieCerto`,
    description: `Encontre os melhores apartamentos e lançamentos em ${loc.neighborhood}, ${loc.city}. Compare financiamentos, simule MCMV e descubra imóveis compatíveis com seu perfil financeiro.`,
    openGraph: {
      title: `Imóveis em ${loc.neighborhood} | FinancieCerto`,
      description: `${loc.neighborhood}, ${loc.city} – apartamentos, studios, lançamentos e financiamento imobiliário.`,
    },
  };
}

export default async function BairroPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const loc = slugToLocation(slug);
  // Estado sem cidade mapeada (ex: GO, RJ) → nunca foi liberado no site.
  if (!loc.city) notFound();
  return <BairroContent location={loc} searchParams={sp} />;
}
