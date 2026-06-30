'use client';

import { useEffect } from 'react';

export function HomeEngagement() {
  useEffect(() => {
    // Evento base: usuário viu a home
    import('@/lib/gtag').then(m => m.trackHomeEngagement({ elemento: 'home_view' }));

    // Track cliques em CTA principais
    const handleSimuladorClick = () => {
      import('@/lib/gtag').then(m => m.trackHomeEngagement({ elemento: 'simulador_cta' }));
    };
    const handleImoveisClick = () => {
      import('@/lib/gtag').then(m => m.trackHomeEngagement({ elemento: 'imoveis_cta' }));
    };
    const handleAprendaClick = () => {
      import('@/lib/gtag').then(m => m.trackHomeEngagement({ elemento: 'aprenda_cta' }));
    };

    // Procura botões com data-track e adiciona listeners
    const simuladorBtn = document.querySelector('[data-track="simulador"]');
    const imoveisBtn = document.querySelector('[data-track="imoveis"]');
    const aprendaBtn = document.querySelector('[data-track="aprenda"]');

    simuladorBtn?.addEventListener('click', handleSimuladorClick);
    imoveisBtn?.addEventListener('click', handleImoveisClick);
    aprendaBtn?.addEventListener('click', handleAprendaClick);

    return () => {
      simuladorBtn?.removeEventListener('click', handleSimuladorClick);
      imoveisBtn?.removeEventListener('click', handleImoveisClick);
      aprendaBtn?.removeEventListener('click', handleAprendaClick);
    };
  }, []);

  return null;
}
