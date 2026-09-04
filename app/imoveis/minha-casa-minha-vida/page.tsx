import MCMVContent from './MCMVContent';
import { getMCMVStats } from '@/lib/mcmv-catalog';
import { SITE_CONFIG } from '@/lib/schema';

// Estatísticas (empreendimentos/unidades por faixa) não precisam ser
// segundo-a-segundo — revalida a cada hora, igual à home.
export const revalidate = 3600;

// Título anterior tinha ~76 caracteres e truncava no Google; canonical e OG
// completo (siteName/locale/type) faltavam por completo — o openGraph do
// app/imoveis/layout.tsx pai não é herdado aqui: metadata do Next.js não faz
// merge profundo, um openGraph definido no filho substitui o do pai inteiro
// (auditoria de SEO, 2026-09-04).
const MCMV_TITLE = 'Imóveis Minha Casa Minha Vida em SP | FinancieCerto';
const MCMV_DESCRIPTION = 'Empreendimentos dentro do teto de preço do Minha Casa Minha Vida (MCMV), das Faixas 1 a 4. Simule seu financiamento e descubra se você tem perfil MCMV.';
const MCMV_URL = `${SITE_CONFIG.domain}/imoveis/minha-casa-minha-vida`;

export function generateMetadata() {
  return {
    title: MCMV_TITLE,
    description: MCMV_DESCRIPTION,
    alternates: { canonical: MCMV_URL },
    openGraph: {
      title: MCMV_TITLE,
      description: MCMV_DESCRIPTION,
      url: MCMV_URL,
      siteName: 'FinancieCerto',
      locale: 'pt_BR',
      type: 'website',
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
