import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/Creator-Workbench',
  assetPrefix: '/Creator-Workbench/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
