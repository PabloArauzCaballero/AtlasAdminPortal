# syntax=docker/dockerfile:1.7
# Imagen del portal de administración. Sigue el mismo patrón que la del front del motor de
# decisiones: construir con todo, servir con lo mínimo.
FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

FROM base AS dependencies
COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
  yarn install --frozen-lockfile

FROM base AS builder
# Las `NEXT_PUBLIC_*` se incrustan en el paquete del navegador AL CONSTRUIR, no al arrancar: cambiar
# una después no tiene ningún efecto. Llegan como build-args (`docker build --build-arg ...`), igual
# que en `Dockerfile.dev`. Antes se contaba con que el desplegador copiara su `.env.local` dentro del
# contexto, y eso metía en la caché del builder también los secretos de servidor de ese archivo:
# `.dockerignore` ya excluye `.env*` (ADM-11, auditoría 2026-10-09).
#
# `NEXT_PUBLIC_ATLAS_ENVIRONMENT` vale `production` por defecto a propósito: un build de esta imagen
# sin el argumento deja el QA Lab en sólo lectura (falla cerrado), nunca en modo de pruebas.
ARG NEXT_PUBLIC_API_BASE_URL=/api/v1
ARG NEXT_PUBLIC_ATLAS_ENVIRONMENT=production
ARG NEXT_PUBLIC_INTERNAL_APP_NAME="ATLAS Internal Platform"
ARG NEXT_PUBLIC_DEFAULT_TENANT_ID=1
ARG NEXT_PUBLIC_API_TIMEOUT_MS=20000
ARG NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE=cookie
ARG NEXT_PUBLIC_INTERNAL_CSRF_HEADER_NAME=""
ARG NEXT_PUBLIC_DECISION_ENGINE_URL=""
# El destino de `rewrites()`: `output: 'standalone'` lo serializa en `server.js` al construir.
ARG INTERNAL_API_ORIGIN=http://127.0.0.1:3005
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_ATLAS_ENVIRONMENT=$NEXT_PUBLIC_ATLAS_ENVIRONMENT \
    NEXT_PUBLIC_INTERNAL_APP_NAME=$NEXT_PUBLIC_INTERNAL_APP_NAME \
    NEXT_PUBLIC_DEFAULT_TENANT_ID=$NEXT_PUBLIC_DEFAULT_TENANT_ID \
    NEXT_PUBLIC_API_TIMEOUT_MS=$NEXT_PUBLIC_API_TIMEOUT_MS \
    NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE=$NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE \
    NEXT_PUBLIC_INTERNAL_CSRF_HEADER_NAME=$NEXT_PUBLIC_INTERNAL_CSRF_HEADER_NAME \
    NEXT_PUBLIC_DECISION_ENGINE_URL=$NEXT_PUBLIC_DECISION_ENGINE_URL \
    INTERNAL_API_ORIGIN=$INTERNAL_API_ORIGIN
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# PLAT-03: la identidad del artefacto se escribe AQUÍ, dentro de la imagen, y `/version` la lee de este
# archivo. `SOURCE_COMMIT` (build-arg de Coolify) manda; si llega vacío se lee `.git/HEAD` del contexto
# (el .dockerignore lo deja pasar). Sin ninguno queda `commit: null`: no se inventa, y el smoke lo rechaza.
ARG SOURCE_COMMIT=""
RUN SOURCE_COMMIT="$SOURCE_COMMIT" node scripts/write-build-info.mjs build-info.json
RUN yarn build
# Este portal no tiene `public/`. La copia de más abajo es incondicional —Docker no sabe copiar «si
# existe»— así que se garantiza el directorio aquí; si algún día se añaden recursos estáticos, la
# imagen ya los sirve sin tocar nada.
RUN mkdir -p public

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  HOSTNAME=0.0.0.0 \
  PORT=5273

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/build-info.json ./build-info.json
# `public/` no viaja dentro de `standalone`: Next lo deja fuera y su documentación pide copiarlo
# aparte, igual que `.next/static`. Sin esta línea la imagen no serviría ningún recurso estático.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 5273
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/" || exit 1
CMD ["node", "server.js"]
