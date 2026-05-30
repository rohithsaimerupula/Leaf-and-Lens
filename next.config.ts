import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/index.html',
        permanent: false,
      },
      {
        source: '/register',
        destination: '/register.html',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
