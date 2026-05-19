import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Completely clean config for Vercel
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
