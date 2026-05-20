import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Leaf-and-Lens",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
