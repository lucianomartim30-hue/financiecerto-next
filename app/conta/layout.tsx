// app/conta/layout.tsx
//
// Antes /conta não tinha metadata nenhuma — nem noindex, nem título próprio.
// Ficava indexável por padrão, herdando o título genérico da home. É uma
// área pessoal (login por código, simulações salvas, favoritos) sem valor de
// busca — /favoritos já tinha noindex corretamente, só esta faltava
// (auditoria 2026-09). page.tsx é 'use client', então metadata só pode vir
// daqui.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Minha Conta | FinancieCerto',
  description: 'Acesse suas simulações salvas, favoritos e alertas no FinancieCerto.',
  robots: { index: false, follow: true },
};

export default function ContaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
