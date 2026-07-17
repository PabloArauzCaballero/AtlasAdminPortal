import { NextResponse, type NextRequest } from "next/server";
import { getApiBaseUrl } from "@/shared/api/config";

/**
 * CSP con nonce por request. Va en middleware y no en `next.config.ts` porque
 * el nonce cambia en cada respuesta: es lo que permite `script-src` sin
 * `'unsafe-inline'`, y por tanto que un XSS inyectado no pueda ejecutarse.
 */
function getApiOrigin(): string | null {
  try {
    return new URL(getApiBaseUrl()).origin;
  } catch {
    return null;
  }
}

function buildContentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  const apiOrigin = getApiOrigin();

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    // Next carga sus chunks desde el bootstrap con nonce; strict-dynamic
    // propaga esa confianza sin tener que listar cada chunk.
    "'strict-dynamic'",
    // react-refresh (HMR) evalúa código en desarrollo; en producción no.
    ...(isDev ? ["'unsafe-eval'"] : []),
  ];

  const connectSrc = [
    "'self'",
    ...(apiOrigin ? [apiOrigin] : []),
    // Websocket del HMR en desarrollo.
    ...(isDev ? ["ws:"] : []),
  ];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    // Tailwind y Next inyectan <style> en runtime sin nonce fiable; el riesgo
    // de style-src inline es muy inferior al de script-src.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function middleware(request: NextRequest): NextResponse {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = buildContentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next lee esta cabecera del request para propagar el nonce a sus <script>.
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Solo documentos: los assets de _next/static ya salen con las cabeceras
    // estáticas de next.config.ts y no necesitan nonce.
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
