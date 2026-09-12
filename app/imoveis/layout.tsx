// app/imoveis/layout.tsx
import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/schema';

// Título/descrição antes diziam "em SP", mas o catálogo já cobre SP, RS, PR,
// SC e RJ (auditoria 2026-09) — corrigido pra não prometer um escopo que o
// conteúdo real não tem.
export const metadata: Metadata = {
  title: 'Imóveis e Empreendimentos à Venda — com Simulação de Financiamento | FinancieCerto',
  description: 'Busque imóveis e empreendimentos à venda — na planta, em obras e prontos, em várias cidades do Brasil. Cada imóvel já vem com a simulação de financiamento (MCMV, SBPE, SFI) compatível com sua renda.',
  keywords: 'portal de imóveis, empreendimentos à venda, lançamentos imobiliários, apartamentos à venda, imóveis na planta, imóveis prontos, financiamento imobiliário',
  alternates: { canonical: `${SITE_CONFIG.domain}/imoveis` },
  openGraph: {
    title: 'Imóveis e Empreendimentos à Venda | FinancieCerto',
    description: 'Milhares de imóveis em várias cidades do Brasil, já filtrados pela sua capacidade de financiamento.',
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
