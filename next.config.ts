import type { NextConfig } from "next";

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async redirects() {
    return [
      // ── Rotas legadas do site anterior ─────────────────────────────────────
      { source: '/index',                    destination: '/',            permanent: true },
      { source: '/index.html',               destination: '/',            permanent: true },
      { source: '/home',                     destination: '/',            permanent: true },
      // Singular → plural (evita duplicação e 404)
      { source: '/imovel/:id',               destination: '/imoveis/:id', permanent: true },
      // Páginas de bairro no formato antigo "/ext/:slug" → "/bairro/:slug-sp"
      { source: '/ext/:slug',                destination: '/bairro/:slug-sp', permanent: true },
      // Rotas antigas de calculadora / simulador
      { source: '/calculadora',              destination: '/simulador',   permanent: true },
      { source: '/simulacao',                destination: '/simulador',   permanent: true },
      // Rotas antigas de modalidades → simulador
      { source: '/mcmv',                     destination: '/simulador',   permanent: true },
      { source: '/sbpe',                     destination: '/simulador',   permanent: true },
      { source: '/sfi',                      destination: '/simulador',   permanent: true },
      // Conteúdo educativo antigo → guia
      { source: '/financiamento-imobiliario', destination: '/guia',       permanent: true },
      { source: '/financiamento',            destination: '/guia',        permanent: true },
      { source: '/como-funciona',            destination: '/guia',        permanent: true },
      // Lista de bairros antigo → imóveis
      { source: '/bairros',                  destination: '/imoveis',     permanent: true },
      { source: '/bairros/:slug',            destination: '/bairro/:slug-sp', permanent: true },
    ];
  },
} satisfies NextConfig;

export default nextConfig;
