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
      { source: '/index',      destination: '/', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/home',       destination: '/', permanent: true },
    ];
  },
} satisfies NextConfig;

export default nextConfig;
