import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Otimizações de performance
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // Compressão otimizada
  compress: true,

  // Experimental features
  experimental: {
    optimizeCss: true,
  },

  // Headers de segurança e cache
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
