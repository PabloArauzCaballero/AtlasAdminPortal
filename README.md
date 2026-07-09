# ATLAS Internal Platform — Fases 1 a 11

Frontend interno Next.js para conectar el portal de sistemas, QA, catálogo de datos, revisión, herramientas, stress testing, usuarios internos, gobierno, lineage, reportería, operación productiva, seguridad de sesión y auditoría con el backend real de ATLAS.

## Stack

- Next.js 15 App Router
- TypeScript strict
- Tailwind CSS
- TanStack Query
- TanStack Table
- React Hook Form + Zod
- Lucide Icons

## Configuración

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

El servicio interno debe estar levantado en:

```txt
http://localhost:3005/api/v1
```

El portal usa el puerto `5273` para coincidir con `INTERNAL_FRONTEND_ORIGIN` del backend.

```bash
yarn install
yarn dev
```

## Validación

```bash
yarn clean
yarn type-check
yarn lint
yarn build
```

## Rutas fase 1

- `/internal/login`
- `/internal`
- `/internal/systems/endpoints`
- `/internal/systems/endpoints/[endpointId]`
- `/internal/data-catalog/tables`
- `/internal/data-catalog/tables/[entityId]`
- `/internal/qa/suites`
- `/internal/qa/suites/[suiteId]`
- `/internal/qa/runs`
- `/internal/qa/runs/[runId]`
- `/internal/audit`
- `/internal/audit/request/[requestId]`
- `/internal/settings/profile`

## Rutas fase 2

- `/internal/review-queue`
- `/internal/systems/tools`
- `/internal/systems/tools/[toolId]`
- `/internal/systems/tools/health`
- `/internal/qa/stress`
- `/internal/qa/stress/[profileId]`
- `/internal/qa/stress/runs`
- `/internal/settings/users`
- `/internal/settings/users/[internalUserId]`
- `/internal/settings/roles`
- `/internal/settings/catalog-sync`

## Rutas fase 3

- `/internal/lineage`
- `/internal/lineage/table/[schemaName]/[tableName]`
- `/internal/governance`
- `/internal/governance/pii`
- `/internal/business-metadata/domains`
- `/internal/reports/readiness`

## Regla clave

No se hardcodean tablas, columnas, endpoints, payloads, respuestas esperadas, reglas, reportes ni metadata de negocio. Todo sale del backend real.

## Criterio fase 3

La Fase 3 no inventa reportería ni gobierno avanzado. Construye pantallas de diagnóstico y preparación usando endpoints existentes:

```txt
GET /systems/endpoints
GET /systems/data-entities
GET /systems/impact/by-table/:schemaName/:tableName
GET /systems/test-suites
GET /systems/dashboard
```

Reporterías ejecutivas reales deben esperar contratos como `report_definitions`, `report_widgets` y fuentes autorizadas.


## Rutas fase 4

- `/internal/search`
- `/internal/operations/catalogs`
- `/internal/business-metadata/definitions`
- `/internal/governance/policies`
- `/internal/data-quality/issues`
- `/internal/risk-policy/current`
- `/internal/release-readiness`

## Criterio fase 4

La Fase 4 conecta endpoints operativos reales y evita reportería ficticia. Las acciones de calidad usan idempotencia.

## Revisión integral Fase 1 + Fase 2 + Fase 3 + Fase 4

Ajustes finales aplicados:

- Build estabilizado con `cross-env NEXT_PRIVATE_BUILD_WORKER=1` para evitar bloqueos de trazado en Next 15.
- Timeout configurable de API con `NEXT_PUBLIC_API_TIMEOUT_MS`.
- Errores de red y timeout convertidos a mensajes controlados para UI.
- `requestId` se intenta leer desde payload y headers (`x-request-id` / `x-correlation-id`).
- `validate` no depende de Yarn internamente, por lo que puede ejecutarse con `yarn validate` o `npm run validate`.

Comandos recomendados:

```bash
yarn install
yarn clean
yarn validate
yarn build
npm audit --audit-level=high
```

Notas:

- El proyecto está preparado para Yarn 1.22.22.
- No subir `package-lock.json`; se excluye por `.gitignore` para evitar mezcla de gestores.
- La sesión aún vive en `sessionStorage`; antes de producción se recomienda migrar a cookies HttpOnly emitidas por el servicio interno.

## Fase 5 — hardening de mantenibilidad

La Fase 5 no agrega pantallas decorativas. Refuerza arquitectura y calidad para evitar deuda técnica de largo plazo.

Cambios principales:

- Refactor de archivos grandes para cumplir regla ATLAS: ningún archivo TS/TSX en `src` supera 300 líneas.
- Separación de `AppShell` en sidebar, topbar, breadcrumbs, buscador y configuración de navegación.
- Separación de tipos de Systems Ops por dominio: catálogo, QA/stress y revisión/auditoría.
- Separación de tablas/columnas de Review Queue, Lineage, Endpoint Detail, Release Readiness y Data Quality.
- Nuevo quality gate:

```bash
yarn max-lines
```

`yarn validate` ahora ejecuta:

```bash
yarn max-lines
yarn format:check
yarn type-check
yarn lint
```

Criterio obligatorio desde esta fase:

```txt
Ningún archivo de código TS/TSX dentro de src puede superar 300 líneas.
Si una pantalla crece, debe separarse en hooks, services, columns, cards, dialogs, builders o componentes pequeños.
```

## Fase 6 — cierre de pendientes por backend ajustado

Esta fase corrige los pendientes que quedaron porque el backend todavía no tenía contratos finales de RBAC, búsqueda global y readiness.

Cambios principales:

- Soporte de autenticación interna compatible con cookies HttpOnly y con token Bearer durante transición.
- `/internal/auth/me` puede restaurar sesión activa desde cookie segura.
- `credentials: include` queda habilitado en el cliente API para sesiones internas con cookies.
- Roles internos ahora consumen `/internal/roles`; ya no se derivan desde usuarios.
- Nueva pantalla `/internal/settings/permissions` consumiendo `/internal/permissions`.
- Permisos de navegación y pantallas alineados con RBAC granular final.
- Búsqueda global consume `/internal/search` en lugar de armar resultados desde múltiples consultas del cliente.
- Readiness de release consume `/internal/release-readiness`; el navegador ya no calcula el semáforo crítico.
- Stress QA usa permiso `systems.stress.execute` para ejecución.
- Revisión de catálogo separa lectura `systems.reviewQueue.read` y resolución `systems.reviewQueue.resolve`.
- Ajuste de rutas a contratos finales: `/systems/stress-profiles/:id/run` y `/systems/action-logs/request/:requestId`.

Validación ejecutada:

```bash
npm run validate
npm run build
npm audit --audit-level=high
```

Resultado: `max-lines`, formato, type-check, lint y build OK. Sin vulnerabilidades high/critical.


## Fase 7 — reportería dinámica y reglas de calidad

Rutas agregadas:

- `/internal/reports`
- `/internal/reports/[reportId]`
- `/internal/data-quality/rules`
- `/internal/data-quality/rules/[ruleId]`

Contratos usados:

```txt
GET  /internal/reports
GET  /internal/reports/:reportId
POST /internal/reports/:reportId/run
GET  /internal/reports/:reportId/snapshots
GET  /internal/data-quality/rules
GET  /internal/data-quality/rules/:ruleId
POST /internal/data-quality/rules/:ruleId/run
```

Criterios:

- No hay SQL en frontend.
- Los widgets y filtros de reportes vienen desde backend.
- Las reglas de calidad vienen desde backend.
- Ejecución protegida por permisos granulares.
- Ningún archivo TS/TSX de `src` supera 300 líneas.

## Fase 8 — glosario, gobierno detallado y lineage oficial

Rutas agregadas:

- `/internal/business-metadata/glossary`
- `/internal/business-metadata/glossary/[termId]`
- `/internal/governance/policies/[policyId]`
- `/internal/lineage/official`
- `/internal/lineage/nodes/[nodeId]`
- `/internal/lineage/impact`

Contratos usados:

```txt
GET /internal/business-metadata/glossary
GET /internal/business-metadata/terms/:termId
GET /internal/governance/policies/:policyId
GET /internal/lineage
GET /internal/lineage/nodes/:nodeId
GET /internal/lineage/impact
```

Criterios:

- Glosario y términos vienen desde el servicio interno.
- Detalle de políticas viene desde contrato dedicado; la vista consolidada de `/operations` queda como resumen.
- Lineage oficial consume nodos/aristas del servicio interno; la vista derivada anterior queda como apoyo.
- No se agregaron datos de negocio hardcodeados.
- Ningún archivo TS/TSX de `src` supera 300 líneas.

## Fase 9 — Operación productiva

La Fase 9 agrega control operativo sobre procesos internos que no deben quedar ocultos al equipo de sistemas:

```txt
/internal/jobs
/internal/jobs/[jobId]
/internal/alerts
/internal/exports
/internal/exports/[exportId]
```

Contratos esperados:

```txt
GET  /internal/jobs
GET  /internal/jobs/:jobId
POST /internal/jobs/:jobId/retry
POST /internal/jobs/:jobId/cancel
GET  /internal/alerts
POST /internal/alerts/:alertId/acknowledge
GET  /internal/exports
GET  /internal/exports/:exportId
```

Permisos usados:

```txt
internal.jobs.read
internal.jobs.execute
internal.alerts.read
internal.alerts.acknowledge
internal.exports.read
```

Reglas aplicadas:

```txt
- Nada de archivos TS/TSX sobre 300 líneas.
- Filtros derivados desde datos reales recibidos.
- Acciones críticas con confirmación.
- Sin metadata ni estados de negocio hardcodeados.
- Sin SQL ni reglas de negocio en frontend.
```

## Fase 10 — Hardening de seguridad y producción

La Fase 10 endurece sesión, exportaciones y preparación productiva.

Ruta agregada:

```txt
/internal/security/session
```

Cambios principales:

```txt
- Política de sesión para no persistir tokens cuando el backend usa cookies HttpOnly.
- Sanitización segura de returnTo en login.
- Soporte opcional de header CSRF para mutaciones cookie-based.
- Ambiente visible configurable por .env.
- Exportaciones con permiso dedicado internal.exports.download y confirmación explícita.
- Pantalla de checks de sesión, MFA, contexto seguro, expiración, roles y permisos efectivos.
```

Variables nuevas:

```env
NEXT_PUBLIC_ATLAS_ENVIRONMENT=local
NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE=auto
NEXT_PUBLIC_INTERNAL_CSRF_HEADER_NAME=
```

Criterio de producción:

```txt
Usar cookies HttpOnly + Secure + SameSite + refresh rotation en backend.
No usar NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE=session en producción.
No entregar URLs de exportación permanentes o no auditables.
```


## Fase 11 — cierre técnico y auditoría final

La Fase 11 no agrega pantallas nuevas. Cierra el ciclo técnico con foco en mantenibilidad, contratos y readiness de producción.

Cambios principales:

- Cliente API separado en módulos pequeños para evitar un archivo central cercano al límite de 300 líneas.
- Nuevo quality gate `source-boundaries` para impedir:
  - `fetch` directo fuera de `src/shared/api/transport.ts`.
  - `localStorage`/`sessionStorage` fuera de `src/shared/auth/session-storage.ts`.
  - `dangerouslySetInnerHTML` en cualquier archivo TS/TSX.
- `npm run validate` ahora ejecuta `max-lines`, `source-boundaries`, formato, type-check y lint.
- Exportaciones validan URL segura antes de permitir apertura.
- Contratos frontend/backend documentados en `docs/contracts/frontend-backend-contracts.md`.
- Checklist de producción documentado en `docs/release/production-readiness-checklist.md`.
- Comandos finales en `docs/release/final-validation-commands.md`.

Comando final recomendado:

```bash
npm run clean && npm run validate && npm run build && npm audit --audit-level=high
```

Después de Fase 11, lo correcto es probar contra backend real levantado y crear pruebas E2E. No conviene seguir agregando pantallas sin contratos y datos reales.
