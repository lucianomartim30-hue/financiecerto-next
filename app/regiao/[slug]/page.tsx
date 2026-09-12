import { notFound } from "next/navigation";
import { slugToRegion, REGIONS } from "@/lib/regions";
import { SITE_CONFIG } from "@/lib/schema";
import RegiaoContent from "./RegiaoContent";

export function generateStaticParams() {
  return REGIONS.map(r => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const region = slugToRegion(slug);
  if (!region) return {};
  const top = (region.cities?.length ? region.cities : region.neighborhoods).slice(0, 6).join(', ');
  // "de {city}" só faz sentido quando a região é uma ZONA dentro de uma
  // cidade (ex.: "Zona Sul de São Paulo"). Curitiba e Rio de Janeiro agora
  // também têm `neighborhoods` preenchido (pro fix do "top" vazio acima),
  // mas `name === city` nesses casos — sem essa checagem virava "Curitiba de
  // Curitiba" (auditoria 2026-09).
  const isZonaDentroDeCidade = region.neighborhoods.length > 0 && region.name !== region.city;
  const place = isZonaDentroDeCidade ? `${region.name} de ${region.city}` : region.name;
  const url = `${SITE_CONFIG.domain}/regiao/${region.slug}`;
  // Guarda contra `top` vazio (região sem cities/neighborhoods cadastrados)
  // — antes gerava "...em Curitiba —  e mais." com a lista faltando
  // (auditoria 2026-09). Populamos as duas regiões que causavam isso, mas o
  // template não deveria mais quebrar assim se acontecer de novo.
  const exemplos = top ? ` — ${top} e mais` : '';
  return {
    title: `Imóveis ${region.article} ${place} | FinancieCerto`,
    description: `Encontre apartamentos e lançamentos ${region.article} ${place}${exemplos}. Compare financiamentos, simule MCMV e descubra imóveis compatíveis com sua renda.`,
    alternates: { canonical: url },
    openGraph: {
      title: `Imóveis ${region.article} ${place} | FinancieCerto`,
      description: `${place} — apartamentos, lançamentos e financiamento imobiliário${top ? ` em ${top}` : ''}.`,
      url,
      siteName: 'FinancieCerto',
      locale: 'pt_BR',
      type: 'website',
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
