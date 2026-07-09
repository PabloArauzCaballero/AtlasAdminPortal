import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.resolve(__dirname),
  eslint: {
    // Lint se ejecuta explícitamente con `yarn lint` / `npm run lint`.
    // Evita que `next build` vuelva a analizar artefactos generados o se bloquee en CI/Windows.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScript se valida en `npm run validate` antes del build.
    // Evita bloqueos intermitentes de Next 15 durante "Checking validity of types".
    ignoreBuildErrors: true,
  },
  experimental: {
    // Build más estable para este portal interno: limita workers de generación estática.
    // Evita bloqueos intermitentes en CI/Windows/Coolify con muchas rutas client-only.
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1,
  },
};

export default nextConfig;
