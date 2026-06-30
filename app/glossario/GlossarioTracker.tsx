'use client';

import { useEffect } from 'react';

export function GlossarioTracker() {
  useEffect(() => {
    import('@/lib/gtag').then(m => m.trackPaginaConteudo({ pagina: '/glossario', tipo: 'glossario_termos' }));
  }, []);

  return null;
}
