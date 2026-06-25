// app/imoveis/layout.tsx
import SchemaMarkup from '@/components/SchemaMarkup';
import { searchResultsPage, breadcrumb, SITE_CONFIG } from '@/lib/schema';

export default function ImoveisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const schemas = [
    searchResultsPage({
      url: `${SITE_CONFIG.domain}/imoveis`,
      title: 'Imóveis à Venda e Aluguel',
      description: 'Busque imóveis à venda e aluguel com financiamento disponível.',
    }),
    breadcrumb([
      { name: 'Início', url: SITE_CONFIG.domain },
      { name: 'Imóveis', url: `${SITE_CONFIG.domain}/imoveis` },
    ]),
  ];

  return (
    <>
      <SchemaMarkup schemas={schemas} />
      {children}
    </>
  );
}
