import MCMVContent from './MCMVContent';
import { getMCMVStats } from '@/lib/mcmv-catalog';

// Estatísticas (empreendimentos/unidades por faixa) não precisam ser
// segundo-a-segundo — revalida a cada hora, igual à home.
export const revalidate = 3600;

export function generateMetadata() {
  return {
    title: 'Imóveis Minha Casa Minha Vida — Simulação de Financiamento | FinancieCerto',
    description: 'Empreendimentos dentro do teto de preço do Minha Casa Minha Vida (MCMV), das Faixas 1 a 4. Simule seu financiamento e descubra se você tem perfil MCMV.',
    openGraph: {
      title: 'Imóveis Minha Casa Minha Vida | FinancieCerto',
      description: 'Empreendimentos dentro do teto de preço do MCMV — Faixas 1 a 4, com simulação de financiamento incluída.',
    },
  };
}

export default async function MCMVPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const stats = await getMCMVStats();
  return <MCMVContent stats={stats} searchParams={sp} />;
}
