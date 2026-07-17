import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * Cabeceras de seguridad estáticas. La CSP NO vive aquí: necesita un nonce por
 * request y se emite desde `src/middleware.ts`.
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  // Los navegadores ignoran HSTS sobre http, pero solo se emite en producción
  // para no ensuciar el desarrollo local.
  ...(process.env.NODE_ENV === 'production'
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.resolve(__dirname),
  experimental: {
    // Build más estable para este portal interno: limita workers de generación estática.
    // Evita bloqueos intermitentes en CI/Windows/Coolify con muchas rutas client-only.
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
