/**
 * FinancieCerto — Service Worker (KILL-SWITCH / fc-v3)
 *
 * Este Service Worker NÃO faz cache. Sua única função é desinstalar
 * qualquer Service Worker antigo (fc-v1 / fc-v2) que possa ter guardado
 * bundles JS/HTML de deploys anteriores — o que travava a hidratação do
 * React e deixava os botões sem responder em produção.
 *
 * Ao ativar, ele:
 *   1. Apaga TODOS os caches do domínio
 *   2. Cancela o próprio registro (unregister)
 *   3. Assume o controle das abas abertas para limpar imediatamente
 *
 * O browser busca este arquivo automaticamente para registros existentes,
 * então mesmo navegadores com o SW antigo recebem este kill-switch.
 */

self.addEventListener('install', () => {
  // Ativa de imediato, sem esperar abas antigas fecharem
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Apaga todos os caches (fc-v2-static, fc-v2-pages, etc.)
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));

      // Assume controle e se autodestrói
      await self.clients.claim();
      await self.registration.unregister();
    })()
  );
});

// Sem handler de fetch → o browser carrega tudo direto da rede (sem cache).
