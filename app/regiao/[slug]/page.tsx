import { Suspense } from "react";
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
  const isCityRegion = !!region.cities?.length;
  const top = (region.cities?.length ? region.cities : region.neighborhoods).slice(0, 6).join(', ');
  const place = isCityRegion ? region.name : `${region.name} de São Paulo`;
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
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg)" }} />}>
      <RegiaoContent region={region} searchParams={sp} />
    </Suspense>
  );
}
