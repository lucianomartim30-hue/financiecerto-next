// app/simulador/na-planta/layout.tsx
import type { Metadata } from 'next';
import SchemaMarkup from '@/components/SchemaMarkup';
import { webApplication, breadcrumb, faqPage, SITE_CONFIG } from '@/lib/schema';
import { FAQ_NA_PLANTA } from './faq-data';

const TITLE = 'Simulador de Imóvel na Planta | FinancieCerto';
const DESCRIPTION = 'Simule a compra do seu imóvel na planta: entrada, parcelas à construtora e juros evolutivos MCMV. Descubra quanto você paga do ato até a entrega das chaves.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_CONFIG.domain}/simulador/na-planta` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_CONFIG.domain}/simulador/na-planta`,
  },
};

// FAQ_NA_PLANTA agora vive em ./faq-data.ts — arquivo neutro compartilhado
// entre este layout (server, gera o Schema) e page.tsx (client, gera o bloco
// visível). Importar dados de dentro de layout.tsx num arquivo 'use client'
// puxa o layout inteiro pro bundle do client e quebra o export de `metadata`.

export default function NaPlantaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const schemas = [
    webApplication({
      url: `${SITE_CONFIG.domain}/simulador/na-planta`,
      title: TITLE,
      description: DESCRIPTION,
    }),
    breadcrumb([
      { name: 'Início', url: SITE_CONFIG.domain },
      { name: 'Simulador', url: `${SITE_CONFIG.domain}/simulador` },
      { name: 'Na Planta', url: `${SITE_CONFIG.domain}/simulador/na-planta` },
    ]),
    faqPage({
      url: `${SITE_CONFIG.domain}/simulador/na-planta`,
      title: TITLE,
      description: DESCRIPTION,
      questions: FAQ_NA_PLANTA,
    }),
  ];

  return (
    <>
      <SchemaMarkup schemas={schemas} />
      {children}
    </>
  );
}
