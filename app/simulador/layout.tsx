// app/simulador/layout.tsx
import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/schema';

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

// O schema (WebApplication/BreadcrumbList/FAQPage) de /simulador morava aqui,
// mas este layout envolve TODAS as rotas filhas (/simulador/na-planta,
// /simulador/historico-tr) — então o schema aparecia duplicado nelas junto
// com o schema próprio de cada uma. Movido para app/simulador/page.tsx, que
// só renderiza na rota exata /simulador (auditoria 2026-09).

export default function SimuladorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
