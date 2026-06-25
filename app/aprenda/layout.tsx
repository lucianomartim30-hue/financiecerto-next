// app/aprenda/layout.tsx
import SchemaMarkup from '@/components/SchemaMarkup';
import { collectionPage, breadcrumb, SITE_CONFIG } from '@/lib/schema';
import { getArtigos } from '@/lib/artigos';

export default function AprendaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const artigos = getArtigos();

  const schemas = [
    collectionPage({
      url: `${SITE_CONFIG.domain}/aprenda`,
      title: 'Aprenda — Guia de Financiamento Imobiliário',
      description: 'Artigos sobre MCMV, imóvel na planta, FGTS, SAC, Price e tudo sobre financiamento imobiliário.',
      items: artigos.map(a => ({
        url: `${SITE_CONFIG.domain}/aprenda/${a.slug}`,
        headline: a.titulo,
      })),
    }),
    breadcrumb([
      { name: 'Início', url: SITE_CONFIG.domain },
      { name: 'Aprenda', url: `${SITE_CONFIG.domain}/aprenda` },
    ]),
  ];

  return (
    <>
      <SchemaMarkup schemas={schemas} />
      {children}
    </>
  );
}
