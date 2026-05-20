import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
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
      {
        source: '/admin',
        destination: '/admin/login.html',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
