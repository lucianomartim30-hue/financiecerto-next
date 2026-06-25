// app/simulador/na-planta/layout.tsx
import SchemaMarkup from '@/components/SchemaMarkup';
import { webApplication, breadcrumb, SITE_CONFIG } from '@/lib/schema';

export default function NaPlantaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const schemas = [
    webApplication({
      url: `${SITE_CONFIG.domain}/simulador/na-planta`,
      title: 'Simulador Imóvel na Planta — FinancieCerto',
      description: 'Simule o fluxo real de compra na planta: ato, mensais à construtora, juros de evolução e parcela após habite-se.',
    }),
    breadcrumb([
      { name: 'Início', url: SITE_CONFIG.domain },
      { name: 'Simulador', url: `${SITE_CONFIG.domain}/simulador` },
      { name: 'Na Planta', url: `${SITE_CONFIG.domain}/simulador/na-planta` },
    ]),
  ];

  return (
    <>
      <SchemaMarkup schemas={schemas} />
      {children}
    </>
  );
}
