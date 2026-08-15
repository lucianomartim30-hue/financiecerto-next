// Força renderização dinâmica (sem pré-render estático/ISR) — essa página não
// tem nada de útil pra pré-renderizar (todo o catálogo é buscado no navegador
// via useEffect), mas o pré-render estático da Vercel ficava servindo uma
// cópia antiga da página por vários minutos após cada deploy (X-Nextjs-Stale-Time),
// fazendo quem acessasse nesse meio-tempo ver a versão anterior do site mesmo já
// tendo corrigido o bug. 'use client' bloqueia esse export dentro do próprio
// componente (ImoveisClient.tsx já importa `dynamic` do next/dynamic — nome
// conflitante), por isso vive aqui, no Server Component da rota.
export const dynamic = 'force-dynamic';

import ImoveisClient from './ImoveisClient';

export default function ImoveisPage() {
  return <ImoveisClient />;
}
