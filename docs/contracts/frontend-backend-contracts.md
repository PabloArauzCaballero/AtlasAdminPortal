# ATLAS Frontend/Backend Contract Matrix

Este documento consolida los contratos que el portal interno consume al cierre de Fase 11. Debe usarse como checklist cuando el backend cambie rutas, permisos o envelopes.

## Envelope esperado

Todas las respuestas exitosas pueden venir como dato directo o como envelope:

```json
{
  "requestId": "uuid",
  "data": {},
  "timestamp": "2026-07-04T00:00:00.000Z"
}
```

Las listas paginadas aceptan `meta` o `pagination`. El cliente normaliza `pagination` hacia `meta`.

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Los errores deben incluir mensaje humano y `requestId` cuando exista:

```json
{
  "requestId": "uuid",
  "error": {
    "code": "FORBIDDEN",
    "message": "No tienes permiso para realizar esta acción."
  },
  "timestamp": "2026-07-04T00:00:00.000Z"
}
```

## Autenticación interna

| Método | Ruta                     | Uso UI                  | Permiso              |
| ------ | ------------------------ | ----------------------- | -------------------- |
| POST   | `/internal/auth/login`   | Login interno           | Público controlado   |
| POST   | `/internal/auth/refresh` | Refresh automático      | Sesión válida/cookie |
| POST   | `/internal/auth/logout`  | Cierre de sesión        | Sesión válida        |
| GET    | `/internal/auth/me`      | Restaurar sesión/perfil | Sesión válida        |

El frontend soporta modo `cookie`, `session` y `auto`. Producción debe usar cookies `HttpOnly`, `Secure`, `SameSite` y rotación de refresh token.

## Systems, QA y catálogo técnico

| Método | Ruta                                              | Pantalla              | Permiso esperado                       |
| ------ | ------------------------------------------------- | --------------------- | -------------------------------------- |
| GET    | `/systems/dashboard`                              | Inicio                | `systems.dashboard.read`               |
| GET    | `/systems/endpoints`                              | Catálogo de endpoints | `systems.endpoints.read`               |
| GET    | `/systems/endpoints/:endpointId`                  | Detalle endpoint      | `systems.endpoints.read`               |
| POST   | `/systems/endpoints/:endpointId/run`              | Ejecutar endpoint     | `systems.endpoints.execute`            |
| POST   | `/systems/endpoints/discover`                     | Descubrir endpoints   | `systems.endpoints.discover`           |
| POST   | `/systems/endpoints/catalog-seed/refresh`         | Sincronizar catálogo  | `systems.endpoints.catalogSeedRefresh` |
| GET    | `/systems/data-entities`                          | Catálogo de tablas    | `systems.dataEntities.read`            |
| GET    | `/systems/data-entities/:entityId`                | Detalle entidad       | `systems.dataEntities.read`            |
| GET    | `/systems/impact/by-table/:schemaName/:tableName` | Impacto por tabla     | `lineage.read`                         |
| GET    | `/systems/review-queue`                           | Cola de revisión      | `systems.reviewQueue.read`             |
| POST   | `/systems/review-queue/:itemId/resolve`           | Resolver revisión     | `systems.reviewQueue.resolve`          |
| GET    | `/systems/tools`                                  | Herramientas internas | `systems.tools.read`                   |
| GET    | `/systems/tools/:toolId`                          | Detalle herramienta   | `systems.tools.read`                   |
| GET    | `/systems/health/tools`                           | Salud de herramientas | `systems.tools.health.read`            |
| POST   | `/systems/tools/infer-requirements`               | Inferir requisitos    | `systems.tools.inferRequirements`      |

## QA y stress

| Método | Ruta                                        | Pantalla        | Permiso esperado            |
| ------ | ------------------------------------------- | --------------- | --------------------------- |
| GET    | `/systems/test-suites`                      | Suites QA       | `systems.qa.read`           |
| GET    | `/systems/test-suites/:suiteId`             | Detalle suite   | `systems.qa.read`           |
| POST   | `/systems/test-suites/:suiteId/run`         | Ejecutar suite  | `systems.qa.execute`        |
| POST   | `/systems/endpoints/:endpointId/run`        | Lab funcional   | `systems.endpoints.execute` |
| POST   | `/systems/endpoints/:endpointId/stress-run` | Lab stress      | `systems.stress.execute`    |
| GET    | `/systems/test-runs`                        | Corridas QA     | `systems.qa.read`           |
| GET    | `/systems/test-runs/:runId`                 | Detalle corrida | `systems.qa.read`           |
| GET    | `/systems/stress-profiles`                  | Perfiles stress | `systems.stress.read`       |
| GET    | `/systems/stress-profiles/:profileId`       | Detalle stress  | `systems.stress.read`       |
| POST   | `/systems/stress-profiles/:profileId/run`   | Ejecutar stress | `systems.stress.execute`    |
| GET    | `/systems/stress-runs`                      | Corridas stress | `systems.stress.read`       |

## Seguridad, usuarios y auditoría

| Método | Ruta                                      | Pantalla              | Permiso esperado            |
| ------ | ----------------------------------------- | --------------------- | --------------------------- |
| GET    | `/internal/users`                         | Usuarios              | `internal.users.read`       |
| GET    | `/internal/users/:internalUserId`         | Detalle usuario       | `internal.users.read`       |
| GET    | `/internal/roles`                         | Roles                 | `internal.roles.read`       |
| GET    | `/internal/permissions`                   | Permisos              | `internal.permissions.read` |
| GET    | `/systems/action-logs`                    | Auditoría             | `audit.events.read`         |
| GET    | `/systems/action-logs/request/:requestId` | Auditoría por request | `audit.events.detail`       |

## Operaciones, gobierno y calidad

| Método | Ruta                                               | Pantalla             | Permiso esperado              |
| ------ | -------------------------------------------------- | -------------------- | ----------------------------- |
| GET    | `/operations/catalogs`                             | Catálogos operativos | `operations.catalogs.read`    |
| GET    | `/operations/definitions`                          | Definiciones         | `operations.definitions.read` |
| GET    | `/operations/data-governance/policies`             | Políticas resumidas  | `governance.policies.read`    |
| GET    | `/operations/risk-policy/current`                  | Política de riesgo   | `operations.riskPolicy.read`  |
| GET    | `/operations/data-quality/issues`                  | Issues calidad       | `dataQuality.issues.read`     |
| POST   | `/operations/data-quality/issues/:issueId/resolve` | Resolver issue       | `dataQuality.issues.resolve`  |
| GET    | `/internal/data-quality/rules`                     | Reglas calidad       | `dataQuality.rules.read`      |
| GET    | `/internal/data-quality/rules/:ruleId`             | Detalle regla        | `dataQuality.rules.read`      |
| POST   | `/internal/data-quality/rules/:ruleId/run`         | Ejecutar regla       | `dataQuality.rules.manage`    |
| GET    | `/internal/governance/policies/:policyId`          | Detalle política     | `governance.policies.read`    |

## Reportería, metadata y lineage

| Método | Ruta                                        | Pantalla         | Permiso esperado         |
| ------ | ------------------------------------------- | ---------------- | ------------------------ |
| GET    | `/internal/search`                          | Búsqueda global  | Sesión válida            |
| GET    | `/internal/release-readiness`               | Readiness        | `systems.dashboard.read` |
| GET    | `/internal/reports`                         | Reportes         | `reporting.read`         |
| GET    | `/internal/reports/:reportId`               | Detalle reporte  | `reporting.read`         |
| POST   | `/internal/reports/:reportId/run`           | Ejecutar reporte | `reporting.execute`      |
| GET    | `/internal/reports/:reportId/snapshots`     | Snapshots        | `reporting.read`         |
| GET    | `/internal/business-metadata/glossary`      | Glosario         | `businessMetadata.read`  |
| GET    | `/internal/business-metadata/terms/:termId` | Detalle término  | `businessMetadata.read`  |
| GET    | `/internal/lineage`                         | Lineage oficial  | `lineage.read`           |
| GET    | `/internal/lineage/nodes/:nodeId`           | Nodo lineage     | `lineage.read`           |
| GET    | `/internal/lineage/impact`                  | Impacto lineage  | `lineage.read`           |

## Operación productiva

| Método | Ruta                                    | Pantalla            | Permiso esperado              |
| ------ | --------------------------------------- | ------------------- | ----------------------------- |
| GET    | `/internal/jobs`                        | Jobs                | `internal.jobs.read`          |
| GET    | `/internal/jobs/:jobId`                 | Detalle job         | `internal.jobs.read`          |
| POST   | `/internal/jobs/:jobId/retry`           | Reintentar job      | `internal.jobs.manage`        |
| POST   | `/internal/jobs/:jobId/cancel`          | Cancelar job        | `internal.jobs.manage`        |
| GET    | `/internal/alerts`                      | Alertas             | `internal.alerts.read`        |
| POST   | `/internal/alerts/:alertId/acknowledge` | Reconocer alerta    | `internal.alerts.acknowledge` |
| GET    | `/internal/exports`                     | Exportaciones       | `internal.exports.read`       |
| GET    | `/internal/exports/:exportId`           | Detalle exportación | `internal.exports.read`       |

La apertura de archivo exportado requiere `internal.exports.download` y confirmación explícita.
