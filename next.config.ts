import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: false,
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;