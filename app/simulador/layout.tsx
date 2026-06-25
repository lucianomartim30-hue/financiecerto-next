// app/simulador/layout.tsx
import SchemaMarkup from '@/components/SchemaMarkup';
import { webApplication, breadcrumb, SITE_CONFIG } from '@/lib/schema';

export default function SimuladorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const schemas = [
    webApplication({
      url: `${SITE_CONFIG.domain}/simulador`,
      title: 'Simulador de Financiamento Imobiliário — FinancieCerto',
      description: 'Simule seu financiamento imobiliário gratuitamente. Identifica MCMV, SBPE ou SFI com taxas reais de 2026.',
    }),
    breadcrumb([
      { name: 'Início', url: SITE_CONFIG.domain },
      { name: 'Simulador', url: `${SITE_CONFIG.domain}/simulador` },
    ]),
  ];

  return (
    <>
      <SchemaMarkup schemas={schemas} />
      {children}
    </>
  );
}
