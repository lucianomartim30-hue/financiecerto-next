// app/imoveis/layout.tsx
import type { Metadata } from 'next';
import SchemaMarkup from '@/components/SchemaMarkup';
import { searchResultsPage, breadcrumb, SITE_CONFIG } from '@/lib/schema';

export const metadata: Metadata = {
  title: 'Imóveis e Empreendimentos à Venda em SP — com Simulação de Financiamento | FinancieCerto',
  description: 'Busque imóveis e empreendimentos à venda em São Paulo — na planta, em obras e prontos. Cada imóvel já vem com a simulação de financiamento (MCMV, SBPE, SFI) compatível com sua renda.',
  keywords: 'portal de imóveis, empreendimentos São Paulo, lançamentos imobiliários, apartamentos à venda SP, imóveis na planta, imóveis prontos, financiamento imobiliário',
  openGraph: {
    title: 'Imóveis e Empreendimentos à Venda em SP | FinancieCerto',
    description: 'Milhares de imóveis em São Paulo, já filtrados pela sua capacidade de financiamento.',
    url: `${SITE_CONFIG.domain}/imoveis`,
    siteName: 'FinancieCerto',
    locale: 'pt_BR',
    type: 'website',
  },
};

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
