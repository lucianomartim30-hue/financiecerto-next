'use client';

import { useEffect } from 'react';

export function SobreTracker() {
  useEffect(() => {
    import('@/lib/gtag').then(m => m.trackPaginaConteudo({ pagina: '/sobre', tipo: 'sobre_empresa' }));
  }, []);

  return null;
}
