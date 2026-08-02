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
  const top = region.neighborhoods.slice(0, 6).join(', ');
  return {
    title: `Imóveis ${region.article} ${region.name} de São Paulo | FinancieCerto`,
    description: `Encontre apartamentos e lançamentos ${region.article} ${region.name} de São Paulo — ${top} e mais. Compare financiamentos, simule MCMV e descubra imóveis compatíveis com sua renda.`,
    openGraph: {
      title: `Imóveis ${region.article} ${region.name} de São Paulo | FinancieCerto`,
      description: `${region.name} de São Paulo — apartamentos, lançamentos e financiamento imobiliário em ${top}.`,
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
