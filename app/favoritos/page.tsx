import { Suspense } from 'react';
import FavoritosContent from './FavoritosContent';

// Conteúdo é 100% pessoal (localStorage do navegador) — nunca deve ser indexado.
export const metadata = {
  title: 'Meus Favoritos | FinancieCerto',
  robots: { index: false, follow: true },
};

export default function FavoritosPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)' }} />}>
      <FavoritosContent />
    </Suspense>
  );
}
