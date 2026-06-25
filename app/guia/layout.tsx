// app/guia/layout.tsx
import SchemaMarkup from '@/components/SchemaMarkup';
import { howTo, breadcrumb, SITE_CONFIG } from '@/lib/schema';

export default function GuiaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const schemas = [
    howTo({
      url: `${SITE_CONFIG.domain}/guia`,
      title: 'Como Financiar um Imóvel: 7 Etapas do Início ao Habite-se',
      description: 'As 7 etapas, em ordem, do momento em que você decide comprar até o dia em que assina o financiamento e recebe as chaves.',
      steps: [
        { position: 1, name: 'Descubra sua Modalidade', text: 'Descubra se você se enquadra no MCMV, SBPE ou SFI antes de procurar imóvel.' },
        { position: 2, name: 'Organize sua Documentação', text: 'Separe documentos pessoais, de renda e do imóvel antes da análise de crédito.' },
        { position: 3, name: 'Saiba Quanto Vai Custar', text: 'Calcule entrada, ITBI, cartório e taxas além do preço do imóvel.' },
        { position: 4, name: 'Escolha SAC ou Price', text: 'Decida o sistema de amortização na contratação do financiamento.' },
        { position: 5, name: 'Assine e Passe pela Análise de Crédito', text: 'Do contrato à aprovação do financiamento — prazo médio de 30 a 60 dias.' },
        { position: 6, name: 'Durante a Obra', text: 'Se for na planta, acompanhe os juros de evolução e os repasses à construtora.' },
        { position: 7, name: 'Use o FGTS a seu Favor', text: 'Use o FGTS na entrada, na amortização ou nas parcelas para reduzir o custo total.' },
      ],
    }),
    breadcrumb([
      { name: 'Início', url: SITE_CONFIG.domain },
      { name: 'Guia', url: `${SITE_CONFIG.domain}/guia` },
    ]),
  ];

  return (
    <>
      <SchemaMarkup schemas={schemas} />
      {children}
    </>
  );
}
