import { notFound } from "next/navigation";
import { slugToRegion, REGIONS } from "@/lib/regions";
import RegiaoContent from "./RegiaoContent";

export function generateStaticParams() {
  return REGIONS.map(r => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const region = slugToRegion(slug);
  if (!region) return {};
  const isNeighborhoodRegion = region.neighborhoods.length > 0;
  const top = (region.cities?.length ? region.cities : region.neighborhoods).slice(0, 6).join(', ');
  const place = isNeighborhoodRegion ? `${region.name} de ${region.city}` : region.name;
  return {
    title: `Imóveis ${region.article} ${place} | FinancieCerto`,
    description: `Encontre apartamentos e lançamentos ${region.article} ${place} — ${top} e mais. Compare financiamentos, simule MCMV e descubra imóveis compatíveis com sua renda.`,
    openGraph: {
      title: `Imóveis ${region.article} ${place} | FinancieCerto`,
      description: `${place} — apartamentos, lançamentos e financiamento imobiliário em ${top}.`,
    },
  };
}

export default async function RegiaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const region = slugToRegion(slug);
  if (!region) notFound();
  return <RegiaoContent region={region} searchParams={sp} />;
}
