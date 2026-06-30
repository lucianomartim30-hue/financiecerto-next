'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function ArtigoTracker({ slug, titulo }: { slug: string; titulo: string }) {
  useEffect(() => {
    // Dispara evento de artigo lido quando o componente monta
    import('@/lib/gtag').then(m => m.trackArtigoLido({ slug, titulo, tempoLeitura: 5 }));
  }, [slug, titulo]);

  return null; // Component não renderiza nada
}
