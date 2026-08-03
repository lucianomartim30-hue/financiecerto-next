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

    // Procura todos os botões com data-track e adiciona listeners
    // (querySelectorAll pois o mesmo CTA aparece mais de uma vez na página — hero + seção final)
    const simuladorBtns = document.querySelectorAll('[data-track="simulador"]');
    const imoveisBtns = document.querySelectorAll('[data-track="imoveis"]');

    simuladorBtns.forEach(el => el.addEventListener('click', handleSimuladorClick));
    imoveisBtns.forEach(el => el.addEventListener('click', handleImoveisClick));

    return () => {
      simuladorBtns.forEach(el => el.removeEventListener('click', handleSimuladorClick));
      imoveisBtns.forEach(el => el.removeEventListener('click', handleImoveisClick));
    };
  }, []);

  return null;
}
