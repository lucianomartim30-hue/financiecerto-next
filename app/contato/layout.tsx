// app/contato/layout.tsx
import SchemaMarkup from '@/components/SchemaMarkup';
import { contactPage, breadcrumb, SITE_CONFIG } from '@/lib/schema';

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
