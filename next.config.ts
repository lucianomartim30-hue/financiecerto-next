import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Lint errors don't block production builds (run eslint separately in CI if needed)
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
