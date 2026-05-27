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
      { source: '/index',          destination: '/',            permanent: true },
      { source: '/index.html',     destination: '/',            permanent: true },
      { source: '/home',           destination: '/',            permanent: true },
      // Unifica rota singular → plural (evita conteúdo duplicado e 404s)
      { source: '/imovel/:id',     destination: '/imoveis/:id', permanent: true },
    ];
  },
} satisfies NextConfig;

export default nextConfig;
