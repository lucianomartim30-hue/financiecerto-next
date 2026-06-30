'use client';

import { useEffect } from 'react';

export function GuiaTracker() {
  useEffect(() => {
    import('@/lib/gtag').then(m => m.trackPaginaConteudo({ pagina: '/guia', tipo: 'guia_completo' }));
  }, []);

  return null;
}
