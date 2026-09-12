// app/simulador/historico-tr/layout.tsx
//
// Antes esta rota não tinha metadata própria — herdava por completo a de
// app/simulador/layout.tsx (o simulador principal), incluindo o canonical
// apontando pra /simulador, não pra /simulador/historico-tr. Isso é pior do
// que "sem canonical": um canonical ativo dizendo ao Google que esta página
// é uma cópia de outra, o que podia impedir a indexação do conteúdo real
// daqui (histórico da TR) — auditoria 2026-09.
import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/schema';

const TITLE = 'Histórico da TR (Taxa Referencial) — Últimos 36 Meses | FinancieCerto';
const DESCRIPTION = 'Veja a evolução mensal da TR nos últimos 36 meses e simule o impacto real da correção monetária no seu saldo devedor SAC.';
const URL = `${SITE_CONFIG.domain}/simulador/historico-tr`;

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

export default function HistoricoTRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
