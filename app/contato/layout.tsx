// app/contato/layout.tsx
import type { Metadata } from 'next';
import SchemaMarkup from '@/components/SchemaMarkup';
import { contactPage, breadcrumb, SITE_CONFIG } from '@/lib/schema';

// Antes sem metadata nenhuma — a página herdava título/descrição genéricos
// da home (auditoria 2026-09). /contato é 'use client', então metadata só
// pode vir daqui (o layout).
const TITLE = 'Contato | FinancieCerto';
const DESCRIPTION = 'Fale com o FinancieCerto: dúvidas sobre financiamento, simulação personalizada, parcerias ou sugestões para o site.';
const URL = `${SITE_CONFIG.domain}/contato`;

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

export default function ContatoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const schemas = [
    contactPage({ url: `${SITE_CONFIG.domain}/contato` }),
    breadcrumb([
      { name: 'Início', url: SITE_CONFIG.domain },
      { name: 'Contato', url: `${SITE_CONFIG.domain}/contato` },
    ]),
  ];

  return (
    <>
      <SchemaMarkup schemas={schemas} />
      {children}
    </>
  );
}
