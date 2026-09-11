'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Componente invisível: dispara um evento page_view a cada troca de rota.
 *
 * O App Router navega entre páginas sem recarregar o documento (SPA de
 * verdade) — então o `gtag('config', ...)` do layout, que só roda uma vez no
 * carregamento inicial do script, só registra a PRIMEIRA página da visita.
 * Sem isso, o relatório em Tempo real mostra usuários ativos (a sessão foi
 * aberta), mas a lista de páginas visualizadas nunca atualiza conforme a
 * pessoa navega pelo site — o config em layout.tsx desativa o page_view
 * automático (`send_page_view: false`) pra esse componente virar a única
 * fonte de verdade, sem duplicar a visualização da primeira página.
 */
export default function GtagPageview() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const gtag = (window as unknown as Record<string, (...args: unknown[]) => void>).gtag;
    if (typeof gtag !== 'function') return;
    gtag('event', 'page_view', {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
