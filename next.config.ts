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
  /**
   * El portal hace de PROXY de su propia API en vez de que el navegador la
   * llame directo.
   *
   * Con `NEXT_PUBLIC_API_BASE_URL` apuntando a un origen externo, la petición
   * sale del navegador del usuario: eso obliga a publicar el backend en
   * Internet, a mantener su lista de CORS al día y a que la cookie de sesión
   * viaje entre dominios. Reescribiendo aquí, el navegador habla SOLO con el
   * portal —mismo origen, sin CORS, sin cookie de terceros— y el salto al
   * backend lo da el servidor de Next desde la red donde el backend ya vive.
   *
   * Es lo que hace utilizable un túnel de desarrollo: se expone el front y el
   * backend se queda donde está.
   */
  async rewrites() {
    const origin = process.env.INTERNAL_API_ORIGIN ?? 'http://127.0.0.1:3005';
    return [{ source: '/api/v1/:path*', destination: `${origin}/api/v1/:path*` }];
  },
};

export default nextConfig;
