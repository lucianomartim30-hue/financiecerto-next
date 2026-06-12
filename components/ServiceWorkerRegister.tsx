'use client';

import { useEffect } from 'react';

/**
 * Limpeza de Service Worker — componente cliente sem UI.
 *
 * Em vez de registrar um SW, este componente REMOVE qualquer Service Worker
 * antigo (PWA fc-v1/fc-v2) que tenha guardado bundles JS/HTML de deploys
 * anteriores. Esse cache obsoleto travava a hidratação do React e deixava
 * os botões sem responder em produção.
 *
 * - Visitante novo (sem SW): não faz nada.
 * - Visitante com SW antigo: desregistra, limpa todos os caches e recarrega
 *   UMA única vez (guarda em sessionStorage para evitar loop de reload).
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length === 0) return; // nada para limpar

        // Remove todos os Service Workers registrados
        await Promise.all(regs.map((r) => r.unregister()));

        // Apaga todos os caches do domínio
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }

        // Recarrega uma única vez para soltar o controle do SW antigo
        if (!sessionStorage.getItem('sw_cleaned')) {
          sessionStorage.setItem('sw_cleaned', '1');
          window.location.reload();
        }
      } catch {
        /* falha silenciosa — não impede o uso do site */
      }
    })();
  }, []);

  return null;
}
