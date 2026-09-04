// app/imoveis/layout.tsx
import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/schema';

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

// Schema (SearchResultsPage/BreadcrumbList) saiu daqui — cada rota-filha
// gera o seu, específico. Um schema aqui no layout pai renderizava junto
// com o de cada filho (Next.js não substitui, soma), duplicando/conflitando
// com o schema próprio de /imoveis/[id] e /imoveis/minha-casa-minha-vida
// (Fase 2.5 da auditoria de SEO, 2026-09-04).
export default function ImoveisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
