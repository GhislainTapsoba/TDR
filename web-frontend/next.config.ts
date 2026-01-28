import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Désactiver Vercel Analytics
  experimental: {
    webVitalsAttributions: ['CLS', 'LCP']
  },
};

export default nextConfig;