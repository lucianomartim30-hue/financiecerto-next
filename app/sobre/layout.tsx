// app/sobre/layout.tsx
import SchemaMarkup from '@/components/SchemaMarkup';
import { aboutPage, organization, breadcrumb, SITE_CONFIG } from '@/lib/schema';

export default function SobreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const schemas = [
    aboutPage({ url: `${SITE_CONFIG.domain}/sobre` }),
    organization,
    breadcrumb([
      { name: 'Início', url: SITE_CONFIG.domain },
      { name: 'Sobre', url: `${SITE_CONFIG.domain}/sobre` },
    ]),
  ];

  return (
    <>
      <SchemaMarkup schemas={schemas} />
      {children}
    </>
  );
}
