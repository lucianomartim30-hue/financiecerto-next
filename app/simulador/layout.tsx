// app/simulador/layout.tsx
import type { Metadata } from 'next';
import SchemaMarkup from '@/components/SchemaMarkup';
import { webApplication, breadcrumb, faqPage, SITE_CONFIG } from '@/lib/schema';
import { FAQ_SIMULADOR } from './faq-data';

const TITLE = 'Simulador Minha Casa Minha Vida | FinancieCerto';
const DESCRIPTION = 'Simule seu financiamento imobiliário grátis e descubra se você se enquadra no Minha Casa Minha Vida, SBPE ou SFI, com parcela, taxa e poder de compra.';
const URL = `${SITE_CONFIG.domain}/simulador`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    siteName: 'FinancieCerto',
    locale: 'pt_BR',
    type: 'website',
  },
};

// FAQ_SIMULADOR vive em ./faq-data.ts — arquivo neutro compartilhado entre
// este layout (server, gera o Schema) e page.tsx (client, gera o bloco
// visível). Mesmo padrão de app/simulador/na-planta/layout.tsx.

export default function SimuladorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const schemas = [
    webApplication({
      url: URL,
      title: TITLE,
      // "Minha Casa Minha Vida" por extenso — a sigla MCMV sozinha combinava
      // pior com o termo de busca real (auditoria de SEO, 2026-09-04).
      description: 'Simule seu financiamento imobiliário gratuitamente. Identifica Minha Casa Minha Vida (MCMV), SBPE ou SFI com taxas reais de 2026.',
    }),
    breadcrumb([
      { name: 'Início', url: SITE_CONFIG.domain },
      { name: 'Simulador', url: URL },
    ]),
    faqPage({
      url: URL,
      title: TITLE,
      description: DESCRIPTION,
      questions: FAQ_SIMULADOR,
    }),
  ];

  return (
    <>
      <SchemaMarkup schemas={schemas} />
      {children}
    </>
  );
}
