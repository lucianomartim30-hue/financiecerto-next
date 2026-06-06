import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FinancieCerto',
    short_name: 'FinancieCerto',
    description: 'Simule seu financiamento, descubra sua faixa MCMV e encontre imóveis compatíveis com sua renda.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#1d4ed8',
    orientation: 'portrait-primary',
    categories: ['finance', 'real estate'],
    lang: 'pt-BR',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/icons/screenshot-mobile.png',
        sizes: '390x844',
        type: 'image/png',
        // @ts-expect-error — form_factor é válido mas ainda não tipado no Next.js
        form_factor: 'narrow',
        label: 'FinancieCerto — Simulador de Financiamento',
      },
    ],
    shortcuts: [
      {
        name: 'Simular Financiamento',
        short_name: 'Simulador',
        description: 'Simule parcelas MCMV e SBPE',
        url: '/simulador',
        icons: [{ src: '/icons/icon.svg', sizes: 'any' }],
      },
      {
        name: 'Ver Imóveis',
        short_name: 'Imóveis',
        description: 'Imóveis compatíveis com sua renda',
        url: '/imoveis',
        icons: [{ src: '/icons/icon.svg', sizes: 'any' }],
      },
    ],
  };
}
