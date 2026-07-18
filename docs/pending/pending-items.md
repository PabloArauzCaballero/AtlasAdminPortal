# Pendientes ATLAS Frontend Interno

## Pendientes técnicos

RESUELTO_PARCIAL_ATLAS_FASE6: frontend ya soporta cookies HttpOnly con `credentials: include`; mantener validación de atributos Secure/SameSite/rotación en backend antes de producción.
PENDIENTE_ATLAS: confirmar si el frontend interno quedará definitivamente en puerto 5173 o si se migrará a 3001/3002 y se actualizará `INTERNAL_FRONTEND_ORIGIN` en backend.
RESUELTO_ATLAS_FASE6: `/systems` ya se consume desde frontend con permisos internos granulares.
PENDIENTE_ATLAS: confirmar endpoint backend de edición completa de metadata de tabla desde portal.
PENDIENTE_ATLAS: confirmar endpoint backend de edición completa de metadata de columna independiente de `fieldImpacts`.
PENDIENTE_ATLAS: confirmar endpoint dinámico de `report_definitions`/`report_widgets` antes de construir reportería avanzada.
PENDIENTE_ATLAS: confirmar contrato de lineage graph enriquecido antes de construir la pantalla avanzada de relaciones.
PENDIENTE_ATLAS: confirmar si habrá MFA obligatorio desde fase inicial para usuarios internos.

## Riesgos

RIESGO_ATLAS: copiar las pantallas Stitch como HTML generaría deuda técnica, duplicación de layout y acoplamiento visual.
RIESGO_ATLAS: si se crean reportes mock sin endpoint real, el portal parecerá completo pero no será confiable para dirección, QA ni riesgo.
RIESGO_ATLAS: si el menú se controla por roles hardcodeados en frontend, se romperá cuando cambie RBAC. Fase 1 usa permisos de sesión.
RIESGO_ATLAS: las pantallas de detalle de columna todavía dependen de `fieldImpacts`; si se requiere administración granular, falta endpoint dedicado.

RESUELTO_ATLAS_FASE6: riesgo de RolesGuard legacy cerrado del lado frontend al alinear permisos granulares.
RIESGO_ATLAS_RESUELTO_FASE3_4: `next build` se estabilizó limitando workers de generación estática en `next.config.ts`; validar igualmente en Windows/Coolify antes de producción.

## Supuestos

SUPUESTO_ATLAS: el backend corre en `http://localhost:3005/api/v1`.
SUPUESTO_ATLAS: el tenant local por defecto es `1` salvo configuración distinta.
SUPUESTO_ATLAS: la fase 1 prioriza módulos que ya tienen endpoints reales en backend.
SUPUESTO_ATLAS: los endpoints responden con envelope `{ requestId, data, timestamp }` y errores `{ requestId, error, timestamp }`.

## Pendientes agregados en Fase 2

RESUELTO_ATLAS_FASE6: roles internos ya consumen `/internal/roles`.
RESUELTO_ATLAS_FASE6: permisos internos ya consumen `/internal/permissions`.
PENDIENTE_ATLAS: falta endpoint de edición completa de tool catalog; fase 2 solo muestra datos y ejecuta inferencia.
PENDIENTE_ATLAS: falta endpoint de creación/edición visual completa de stress profiles desde frontend; fase 2 lista, detalla y encola dry-runs.
PENDIENTE_ATLAS: falta endpoint para ver detalle de stress run por ID. Fase 2 muestra detalle desde el row cargado en la lista.
PENDIENTE_ATLAS: confirmar si las acciones de review deben exigir razón obligatoria en backend. Fase 2 envía notas genéricas controladas.
RESUELTO_ATLAS_FASE6: permisos de Fase 2 alineados al RBAC granular final.
RIESGO_ATLAS: ejecutar discover/seed/infer desde UI sin proceso de revisión puede cambiar metadata sensible. Fase 2 añade confirmación y lo restringe por `systems.endpoints.manage`, pero falta workflow de aprobación si negocio lo exige.
SUPUESTO_ATLAS: `/systems/stress-runs` usa la query `suiteId` por compatibilidad con schema compartido, aunque los runs son jobs `systems_stress_run`.

## Pendientes agregados en revisión final Fase 2

PENDIENTE_ATLAS: validar `yarn validate:full` en Windows y en el entorno real de despliegue tras agregar `outputFileTracingRoot` y limitar workers de generación estática.
PENDIENTE_ATLAS: definir si el frontend interno debe seguir Node 22.16.0 como el backend o fijarse a Node 20 LTS si Next presenta problemas de build trace.
RESUELTO_ATLAS_FASE6: `/internal/roles` y `/internal/permissions` integrados.
RIESGO_ATLAS: mezclar `package-lock.json` con Yarn puede causar instalaciones inconsistentes; el zip revisado excluye `package-lock.json`.
RIESGO_ATLAS: las acciones de sincronización de catálogo necesitan diff/preview antes de aplicar cambios en una fase posterior.

## Pendientes agregados en Fase 3

PENDIENTE_ATLAS: crear contratos backend dedicados para `report_definitions`, `report_widgets`, `report_filters` y `report_execution_logs` antes de construir dashboards ejecutivos reales.
PENDIENTE_ATLAS: crear endpoint dedicado de lineage enriquecido con nodos y aristas versionadas; fase 3 usa impacto por tabla/endpoints disponible hoy.
PENDIENTE_ATLAS: crear endpoints específicos para políticas de gobierno (`data_governance_policies`, retención, masking, exportación, uso ML) para dejar de derivar gobierno solo desde flags de entidades/endpoints.
PENDIENTE_ATLAS: agregar detalle granular de columnas/fields por tabla cuando el backend exponga catálogo de columnas independiente.
PENDIENTE_ATLAS: añadir diff/preview de cambios para sincronización de catálogo antes de permitir aplicar cambios en ambientes compartidos.
RIESGO_ATLAS: derivar dominios desde `module` es correcto como puente, pero si los módulos técnicos no coinciden con dominios de negocio se necesita tabla de dominios oficial.
RIESGO_ATLAS: usar listados con `limit=100` es suficiente para fase inicial, pero para cientos/miles de tablas y endpoints se requerirá endpoint agregado para métricas de gobierno y lineage.
SUPUESTO_ATLAS: la preparación de reportería no reemplaza reportería real; solo mide cobertura de metadata para evitar dashboards ficticios.

## Pendientes agregados en Fase 4

RESUELTO_ATLAS_FASE6: pantallas `/operations` quedan alineadas a permisos granulares.
RESUELTO_ATLAS_FASE6: búsqueda global consume `/internal/search`.
RESUELTO_ATLAS_FASE6: release readiness consume `/internal/release-readiness`.
PENDIENTE_ATLAS: agregar workflow de doble aprobación para resolver issues de calidad críticos en producción.
PENDIENTE_ATLAS: añadir endpoints de exportación controlada para catálogos, definiciones, gobierno y calidad.
RESUELTO_ATLAS_FASE6: `/operations` queda tratado como RBAC granular desde la interfaz.
RIESGO_ATLAS: cerrar issues de calidad desde UI sin política adicional puede ser riesgoso en ambiente productivo.
SUPUESTO_ATLAS: Fase 4 mantiene acciones destructivas fuera de UI salvo cierre idempotente de issues de calidad.

## Pendientes agregados en revisión final Fase 3 + Fase 4

PENDIENTE_ATLAS: mantener `experimental.cpus=1` y concurrencia estática en 1 mientras el portal interno tenga muchas rutas client-only; retirar solo si CI/CD demuestra builds estables con concurrencia mayor.
PENDIENTE_ATLAS: crear smoke E2E de navegación interna con sesión válida para cubrir Fase 3 y Fase 4 antes de producción.
PENDIENTE_ATLAS: exponer métricas agregadas server-side para búsqueda, gobierno, relaciones y readiness; los cálculos client-side son válidos para fase inicial pero no para miles de entidades.
RIESGO_ATLAS: si producción usa múltiples tenants, `NEXT_PUBLIC_DEFAULT_TENANT_ID` no debe reemplazar selección/tenant real de sesión.
RIESGO_ATLAS: `npm audit` mantiene vulnerabilidad moderate transitiva en Next/PostCSS; no se aplicó `audit fix --force` porque propone downgrade rompedor. Monitorear parche de Next.

## Pendientes agregados en revisión integral Fase 1 + Fase 2 + Fase 3 + Fase 4

RESUELTO_PARCIAL_ATLAS_FASE6: frontend soporta cookies HttpOnly con `credentials: include`; verificar atributos Secure/SameSite/rotación en backend antes de producción.
PENDIENTE_ATLAS: definir endpoint backend oficial para navegación/módulos permitidos si se quiere que el menú sea 100% administrable desde permisos y catálogo de UI.
PENDIENTE_ATLAS: agregar pruebas E2E con Playwright cuando exista ambiente estable con backend levantado y usuario QA.
PENDIENTE_ATLAS: agregar rate limit visual/operativo para acciones de sincronización, inferencia y stress QA desde el portal.
PENDIENTE_ATLAS: validar `yarn build` en Windows/Coolify usando el script con `cross-env` y `NEXT_PRIVATE_BUILD_WORKER=1`; en contenedor Linux la ejecución directa de build fue válida, pero Next 15 puede ser sensible al entorno de CI.
RIESGO_ATLAS: si el backend tarda o queda inaccesible, las pantallas pueden acumular requests; revisión integral agrega timeout configurable `NEXT_PUBLIC_API_TIMEOUT_MS` para cortar solicitudes colgadas.
RIESGO_ATLAS: mantener cálculos client-side de readiness, gobierno y búsqueda puede degradar UX al superar cientos/miles de entidades; pasar a agregados server-side antes de producción con alto volumen.

## Pendientes agregados en Fase 5

PENDIENTE_ATLAS: mantener `yarn max-lines` como quality gate obligatorio en CI/CD para evitar que regresen pantallas o componentes de más de 300 líneas.
PENDIENTE_ATLAS: añadir pruebas unitarias para builders puros como `buildReadiness`, `buildDomainNodes` y columnas críticas cuando el proyecto incorpore test runner frontend.
PENDIENTE_ATLAS: evaluar mover navegación interna a endpoint dinámico si el negocio quiere que módulos, labels y orden del menú sean administrables desde base de datos.
PENDIENTE_ATLAS: cuando existan contratos backend de reportería, lineage y gobierno avanzado, evitar agregar pantallas enormes; aplicar la misma separación por feature antes de escribir UI nueva.
RIESGO_ATLAS: si se elimina `max-lines` del pipeline, el portal puede volver a clases/componentes Dios y será más costoso mantenerlo.
SUPUESTO_ATLAS: la regla de 300 líneas aplica a código TS/TSX de `src`; documentación Markdown puede superar ese límite cuando sea necesario para auditoría y contexto.

## Pendientes agregados en Fase 6

PENDIENTE_ATLAS: estabilizar OpenAPI de `/internal/roles`, `/internal/permissions`, `/internal/search` y `/internal/release-readiness` para evitar adaptadores defensivos a largo plazo.
PENDIENTE_ATLAS: validar en ambiente real que cookies internas tengan `HttpOnly`, `Secure`, `SameSite`, dominio correcto y refresh rotation.
RIESGO_ATLAS: si se cambian keys de permisos sin seed/versionado, el menú puede ocultar módulos legítimos aunque los endpoints existan.

## Pendientes agregados en Fase 7

PENDIENTE_ATLAS: convertir `report_filters` en formulario dinámico tipado cuando el backend exponga tipo, opciones, default y obligatoriedad por filtro.
PENDIENTE_ATLAS: agregar normalizadores defensivos si OpenAPI de `/internal/reports` y `/internal/data-quality/rules` todavía no está congelado.
PENDIENTE_ATLAS: agregar detalle histórico de ejecuciones por regla cuando el backend exponga `data_quality_rule_runs` paginado.
PENDIENTE_ATLAS: aplicar rate limit visual/operativo para ejecución de reportes y reglas si el backend reporta límites por usuario o ambiente.
RIESGO_ATLAS: reportes pesados deben ejecutarse con timeout y jobs server-side; el frontend no debe esperar consultas largas sin estado de job.
SUPUESTO_ATLAS: `/internal/reports` y `/internal/data-quality/rules` devuelven paginación `{ items, meta }` según la skill backend.

PENDIENTE_ATLAS: en CI/CD mantener el orden `npm run validate && npm run build`; el build omite typecheck interno de Next porque el typecheck se ejecuta explícitamente antes.

## Fase 7 — revisión estricta final

RESUELTO_ATLAS_FASE7_REVIEW: el cliente API ahora normaliza respuestas paginadas con `pagination` hacia `meta`, manteniendo compatibilidad con contratos backend documentados.
RESUELTO_ATLAS_FASE7_REVIEW: filtros de reportes y reglas ya no usan listas fijas de estado/severidad; derivan opciones desde datos devueltos por API.
RESUELTO_ATLAS_FASE7_REVIEW: ejecución de reportes y reglas de calidad ahora exige confirmación explícita.
RESUELTO_ATLAS_FASE7_REVIEW: al ejecutar reporte se invalidan queries relacionadas para evitar snapshots/listas stale.
RESUELTO_ATLAS_FASE7_REVIEW: se eliminaron referencias visibles a `backend`/`frontend` en pantallas de Fase 7.
PENDIENTE_ATLAS: exponer facetas server-side para filtros de reportes y reglas de calidad cuando el volumen supere una página de resultados.
PENDIENTE_ATLAS: usar jobs con estado observable para reportes o reglas de calidad de ejecución larga.

## Pendientes agregados en Fase 8

PENDIENTE_ATLAS: congelar contratos OpenAPI de `/internal/business-metadata/glossary`, `/internal/business-metadata/terms/:termId`, `/internal/governance/policies/:policyId`, `/internal/lineage`, `/internal/lineage/nodes/:nodeId` y `/internal/lineage/impact` antes de producción.
PENDIENTE_ATLAS: agregar acciones de edición/aprobación para términos y políticas cuando backend exponga workflows con auditoría y control de concurrencia.
PENDIENTE_ATLAS: lineage oficial debe soportar paginación o recorte server-side si el grafo supera miles de nodos/aristas.
PENDIENTE_ATLAS: agregar facetas server-side para glosario y lineage cuando filtros derivados desde la página actual ya no sean suficientes.
RIESGO_ATLAS: si `/internal/lineage` devuelve grafos demasiado grandes, la pantalla puede cargar lento; exigir límites, filtros obligatorios o snapshots resumidos.
RIESGO_ATLAS: si los IDs de políticas consolidadas de `/operations/data-governance/policies` no coinciden con `/internal/governance/policies/:policyId`, los enlaces de detalle devolverán 404; alinear IDs en backend.
SUPUESTO_ATLAS: las políticas de gobierno tienen un identificador único común para privacidad, retención, clasificación y reglas sensibles.

---

## Fase 9 — Pendientes operativos

- PENDIENTE_ATLAS: Confirmar contratos finales de `GET /internal/jobs`, `GET /internal/alerts` y `GET /internal/exports` en el backend de producción.
- PENDIENTE_ATLAS: Definir si las exportaciones deben abrir archivo directo, usar URL firmada temporal o flujo de descarga auditada por endpoint intermedio.
- RIESGO_ATLAS: Jobs pesados y exportaciones deben ejecutarse como procesos asíncronos con límites de concurrencia, timeout, rate limit y auditoría.
- RIESGO_ATLAS: Alertas operativas deben tener deduplicación server-side para evitar ruido y fatiga operacional.
- DECISION_ATLAS: Definir política de retención de archivos exportados y vencimiento de enlaces firmados.

## Pendientes agregados en Fase 10

PENDIENTE_ATLAS: validar en navegador real que las cookies internas tengan `HttpOnly`, `Secure`, `SameSite`, dominio correcto, expiración coherente y refresh rotation.
PENDIENTE_ATLAS: confirmar si el backend exigirá CSRF para mutaciones cookie-based y seedear/documentar `NEXT_PUBLIC_INTERNAL_CSRF_HEADER_NAME` si corresponde.
PENDIENTE_ATLAS: seedear permiso `internal.exports.download` en backend y asignarlo solo a roles autorizados para exportaciones sensibles.
PENDIENTE_ATLAS: reemplazar descarga directa por endpoint auditado si las URLs firmadas temporales no garantizan suficiente trazabilidad.
PENDIENTE_ATLAS: agregar prueba E2E de login, restore desde cookie, expiración, logout y acceso restringido antes de producción.
RIESGO_ATLAS: si `NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE=session` se usa en producción, tokens quedarían accesibles al navegador. RESUELTO_PARCIAL (2026-07-17): el default ya es `cookie` (falla cerrado) y el backend entrega la sesión en cookies `HttpOnly`, así que solo un `session` **explícito** reintroduce el riesgo. Ver RESUELTO_ATLAS_F0_R2_COOKIES.
RIESGO_ATLAS: si las exportaciones no expiran o no son revocables en backend, el frontend no puede compensarlo con controles visuales.
PENDIENTE_ATLAS: mantener build limpio de `.next` en CI/CD mientras Next 15 siga presentando trazado sensible a artefactos previos.

## Pendientes agregados en Fase 11

RESUELTO_ATLAS_FASE11: cliente API separado en módulos pequeños para evitar crecimiento hacia clase/archivo Dios.
RESUELTO_ATLAS_FASE11: quality gate `source-boundaries` agregado a `npm run validate`.
RESUELTO_ATLAS_FASE11: `fetch` directo queda permitido solo en transporte API.
RESUELTO_ATLAS_FASE11: storage del navegador queda permitido solo en módulo de sesión.
RESUELTO_ATLAS_FASE11: exportaciones validan URL segura antes de abrir archivo.
PENDIENTE_ATLAS: crear pruebas E2E con backend real para login, restore cookie, permisos, reportes, exportaciones y logout.
PENDIENTE_ATLAS: congelar OpenAPI interna y usar esta matriz de contratos como fuente de validación previa a producción.
PENDIENTE_ATLAS: definir si `window.open` de exportaciones se reemplaza por endpoint de descarga proxy auditado.
RIESGO_ATLAS: si se eliminan `max-lines` o `source-boundaries` del pipeline, el portal puede volver a acumular deuda técnica silenciosa.
DECISION_ATLAS: después de Fase 11, no agregar nuevas pantallas sin contrato backend estable y prueba con datos reales.

## Revisión final integral Fases 1 a 11

RESUELTO_ATLAS_REVISION_FINAL: refresh de sesión soporta modo cookie-based incluso cuando no hay token local persistido.
RESUELTO_ATLAS_REVISION_FINAL: sesiones locales vencidas se descartan antes de hidratar el portal.
RESUELTO_ATLAS_REVISION_FINAL: URLs de exportación bloquean HTTP externo y esquemas inseguros; HTTP queda solo para localhost/desarrollo.
RESUELTO_ATLAS_REVISION_FINAL: `source-boundaries` controla `window.open` y lo limita al módulo de exportaciones.
RESUELTO_ATLAS_REVISION_FINAL: se eliminó `PENDIENTE_ATLAS` visible en UI; los pendientes quedan en Markdown.
PENDIENTE_ATLAS: ejecutar pruebas E2E contra backend real antes de producción.
PENDIENTE_ATLAS: validar cookies HttpOnly/Secure/SameSite/Domain/Expiry y refresh rotation en navegador real.
PENDIENTE_ATLAS: congelar OpenAPI interna y bloquear cambios de contrato sin actualización frontend/backend.
RIESGO_ATLAS: continuar agregando pantallas sin pruebas integradas puede crear deuda de contrato aunque el código compile.
DECISION_ATLAS: el siguiente trabajo debe ser integración real, no nuevas fases visuales.

## Corrección QA Lab, testing y catálogo reorganizado

RESUELTO_ATLAS_QA_LAB: se agregó `/internal/qa/lab` para seleccionar un endpoint y ejecutar prueba funcional + stress dry-run desde una misma vista.
RESUELTO_ATLAS_QA_LAB: el detalle de endpoint ahora enlaza directo a laboratorio QA con `endpointId` preseleccionado.
RESUELTO_ATLAS_CATALOGO_VISUAL: la vista de detalle de tabla se reorganizó en vista general, columnas, endpoints y gobierno operativo.
RESUELTO_ATLAS_CATALOGO_VISUAL: columnas ahora tienen búsqueda, métricas y tabla legible para cliente.
PENDIENTE_ATLAS: backend debe implementar `POST /systems/endpoints/:endpointId/stress-run` o adaptar ese contrato para encolar stress por endpoint sin obligar al usuario a crear un perfil manual primero.
PENDIENTE_ATLAS: si el laboratorio QA devuelve 404 en stress, alinear backend con el contrato endpoint-specific o exponer búsqueda automática de perfil por endpoint.
RIESGO_ATLAS: sin seeds de `data_catalog_columns`, `qa_endpoint_table_impacts`, `qa_endpoint_field_impacts` y `qa_endpoint_tool_requirements`, las tablas se verán profesionales pero vacías.

## Pendientes agregados en revisión de catálogo de columnas (2026-07-07)

## Pendientes agregados en alta de usuarios internos (2026-07-10)

CORRECCION_ATLAS: la primera versión de este flujo asumió un endpoint `POST /internal/users` que no existe en el backend real. El dump de rutas (`QA_LAB_BACKEND_ENDPOINT_CONTRACT.json`) confirma que el alta real es `POST /internal/auth/signup`, con roles asignados aparte vía `PATCH /internal/users/:internalUserId/roles`. Corregido en frontend y en `docs/contracts/frontend-backend-contracts.md`.
RESUELTO_ATLAS_ALTA_USUARIOS: frontend agrega flujo de alta de usuarios internos (`/internal/settings/users/new`) gateado por `internal.users.manage`, encadenando `signup` + asignación de roles + forzar `mustChangePassword`. La contraseña temporal se genera client-side al azar y se muestra una sola vez al admin para compartirla fuera de banda; nunca la elige el admin ni queda en logs.
PENDIENTE_ATLAS: confirmar el DTO real de `POST /internal/auth/signup` (campos exactos, si `tenantId` va en body o se infiere de `x-tenant-id`, si exige `internal.users.manage` o es público, si rechaza email duplicado). Sin esto el flujo de alta es best-effort, no contrato congelado.
RIESGO_ATLAS: si `signup` resulta ser un endpoint de autoservicio público (sin guard de permisos), cualquiera podría crear una cuenta interna; validar el guard en backend antes de habilitar este flujo en producción.
PENDIENTE_ATLAS: definir si existe (o debe existir) reenvío/expiración de la contraseña temporal si el admin no logra comunicarla al usuario antes de que intente iniciar sesión.
RESUELTO_ATLAS_ALTA_USUARIOS: se agregó `scripts/seed-test-users.mjs` para poblar usuarios internos de prueba (contador, publicista, auditor, analista de riesgo, cobranza, cumplimiento, sistemas, operaciones) contra un backend LOCAL/DEV real, pensado para que un ERP externo tenga cuentas representativas con las que integrar. No inventa códigos de rol: solo asigna un rol si existe uno real en `/internal/roles` que calce por palabra clave; si no hay match, crea el usuario sin rol y avisa. Corre en dry-run por default (`--apply` para ejecutar de verdad); nunca debe apuntarse a producción.
RIESGO_ATLAS: el enum `InternalUserDepartment` no tiene `MARKETING`; el perfil de prueba "publicista" usa `SUPPORT` como aproximación. Si el negocio necesita distinguir marketing de soporte, agregar el departamento real en backend y frontend.

PENDIENTE_ATLAS: implementar seed idempotente de `data_catalog_columns` (introspección `information_schema` + heurísticas PII/financiero + relaciones FK) y exponer `columns[]`/`relations[]` en `/systems/data-entities/:id` e `/systems/impact/by-table/...`. Ver plan completo en `docs/pending/plan-catalogo-columnas-y-granularidad-systems-ops.md`.
PENDIENTE_ATLAS: agregar capas `system_purpose`/`business_purpose` por tabla y columna (qué rol técnico cumple y qué decisión de negocio soporta), con flujo AUTO_DETECTED → NEEDS_REVIEW → APPROVED igual que el resto del catálogo.
RESUELTO_ATLAS_CATALOGO_VISUAL: frontend ya resuelve `endpointId` crudo contra el catálogo de endpoints en la pestaña "Endpoints" de detalle de tabla (`useEndpointsByIds`), en vez de mostrar solo `#id`.

## Auditoría backend↔frontend (2026-07-12)

RESUELTO_ATLAS_AUDITORIA: `getActionLogsByRequest` llamaba `/systems/action-logs/request/:requestId`. Ese path resultó ser un alias real y vigente (`getActionLogsByRequestAlias`, mantenido por compatibilidad — ver `AtlasBackend/src/modules/systems-ops/systems-action-log.controller.ts`), no un endpoint inexistente; el canónico es `/systems/action-logs/by-request/:requestId`. Se cambió a la ruta canónica en `src/features/systems/services.ts` y en la matriz de `docs/contracts/frontend-backend-contracts.md` de todas formas, por prolijidad — **no era un 404**, corrección de estilo, no de bug.

CORRECCION_ATLAS_AUDITORIA: la primera pasada de esta auditoría (mismo día) se hizo contra `QA_LAB_BACKEND_ENDPOINT_CONTRACT.json`, un dump manual desactualizado (195 rutas, fuente declarada `AtlasBackend-FASE5-COMPLETO`, una versión vieja del backend). Esa pasada marcó como "posible deuda documental no confirmada" un CMS de publicaciones (`AdminContentController`, 13 endpoints) y dudó de si jobs/exports/alerts/lineage/business-metadata/data-quality-rules/reports/search/release-readiness tenían backend real. Se repitió la auditoría leyendo directamente `c:/Users/DELL/Documents/GitHub/AtlasBackend/src/modules/**/*.controller.ts` (211 rutas reales, extraídas y verificadas el 2026-07-12) y `QA_LAB_BACKEND_ENDPOINT_CONTRACT.json` se regeneró desde esa fuente. Resultado corregido:

- `AdminContentController` (el CMS de 13 endpoints) **no existe en el backend real actual** — era un módulo de una versión vieja del backend que ya no está. No hay nada que integrar ahí.
- jobs/exports/alerts/lineage/business-metadata/data-quality-rules/reports/search/release-readiness **sí existen y están correctamente integrados**: todos viven bajo `InternalPortalController` (`AtlasBackend/src/modules/internal-portal/internal-portal.controller.ts`, prefix `/internal`, no estaba en el dump viejo) e `InternalAccessCatalogController` (roles/permissions). El frontend ya llama las rutas exactas correctas para los 24 endpoints de ese controller — no había nada que corregir ahí.

RESUELTO_ATLAS_AUDITORIA (2026-07-12, posterior a esta auditoría): se construyó UI para los gaps que en la primera pasada quedaron marcados `PENDIENTE_ATLAS`:

- `AdminExternalProvidersController` (19 endpoints): `src/features/external-providers-admin/` — catálogo+salud con gestión por proveedor (runtime, kill switch, cost-policy, test), página de auditorías (calidad/production-gate/readiness/SLA/uso/idempotencia/retención/sanitización) y acciones sobre solicitudes por ID (aprobar/reintentar/reconstruir/policy-preview). Rutas bajo `/internal/external-providers*`.
- `OperationsController`: `src/features/operations-cases/` — cola de trabajo combinada (revisión manual + fraude) con decisión por caso, e investigación de cliente por ID. Rutas `/internal/operations/work-queue` y `/internal/operations/customers/[customerId]/investigation-summary`.
- `SchemaManagementController` (7 endpoints): `src/features/schema-management/` — versiones, tablas (columnas+relaciones), proponer tabla (form dinámico) y change log con aprobar/rechazar (4 ojos). Rutas bajo `/internal/schema/*`.
- `NotificationsController`: preferencias de cliente (`preferences-section.tsx`), difusión in-app (`broadcast-section.tsx`) e inbox de autoservicio "Mis notificaciones" (`src/features/my-notifications/`, con campanita en el topbar) — los 3 quedaron resueltos.

RESUELTO_ATLAS_GAPS_UI (2026-07-17): los 8 gaps de arriba se cerraron. Ver la sección "Cierre de gaps de UI" al final de este documento para el detalle de cada uno, los hallazgos de backend que salieron al construirlos y lo único que quedó fuera (`catalog-staging-items/decision-batch`, que no es construible hoy). La lista original se conserva abajo como referencia histórica de qué faltaba:

- `RuntimeJobsController` (5 endpoints, prefix `/operations/jobs/*`): process-outbox, process-events, expire-stale-sessions, apply-retention-policies, recalculate-data-quality — cero UI. Distinto de `/internal/jobs` (que el frontend sí usa).
- `CatalogManagementController`: falta el flujo completo de versionado/aprobación (crear versión, submit-for-approval, decision, catalog-ingestions, staging-items decision-batch, definitions/package, risk-policy ruleset-versions crear/activar, data-governance policy-package) — solo están cableados los 4 GET de listado simple.
- `SystemsTestController`: falta autoría de suites/steps (crear/editar suite, crear/editar/reordenar steps) — QA Lab solo lista, ve y ejecuta suites existentes.
- `SystemsStressController`: falta `POST /systems/stress-profiles` (crear/editar perfil) — solo se pueden encolar runs de perfiles ya existentes.
- `SystemsReviewController`: falta `PATCH /systems/data-entities/columns/:columnId/review` (review a nivel columna) — la UI de review solo cubre entidad/endpoint/impacto/tool-requirement, no columna individual.
- `RiskController`: falta `GET /operations/risk-assessments/:id` y `.../explanation` (detalle/explicación de risk assessment).
- `AuditController`: falta `GET /operations/audit/customer/:customerId` y `.../feed` (auditoría por cliente, distinto de `/systems/action-logs`).
- `OperationsSessionsController`: falta `GET /operations/sessions/:sessionId/investigation-summary` (por sesión — no confundir con la de cliente en `OperationsController`, esa sí está resuelta).

## Remediación 10/10 — Fase F0 seguridad (2026-07-16)

RESUELTO_ATLAS_F0_R1: el QA Lab ya no puede exfiltrar la sesión del operador a un host arbitrario. `qa-safety.ts` expone `isHostAllowed`/`assertHostAllowed`/`getQaTrustedHosts`; los runners (`direct-runner`, `stress-runner`, y `journey-runner` por delegación) validan el host antes del fetch, y `request-builder.ts` no adjunta el `accessToken` ni el `csrfToken` de sesión si el host no es confiable (tampoco al construir el preview de un dry-run). El conjunto confiable = bases propias del portal (resueltas desde `QA_BASE_ROUTE_OPTIONS`, que no dependen de input del operador) ∪ `NEXT_PUBLIC_QA_ALLOWED_HOSTS`. Solo el host escrito a mano en "Host URL manual" y los `routeOverride` absolutos necesitan allowlist. Cubierto por `tests/unit/features/qa-lab/{qa-safety,request-builder}.test.ts`.

NOTA_ATLAS_F0_R1: el plan original asumía que las rutas relativas se resolvían contra una base confiable y que solo las absolutas requerían validación. En el código real `buildQaRequest` **siempre** produce una URL absoluta (`resolveQaBaseRoute` + `new URL()`), así que una allowlist vacía habría bloqueado el 100% de las peticiones. De ahí que las bases propias se consideren confiables por construcción.

RESUELTO_ATLAS_F0_R15: `check-source-boundaries.mjs` restringe `credentials: "include"` a `src/shared/api/request-init.ts` y a los dos runners del QA Lab. El patrón cubre tanto la forma literal como `options.credentials ?? "include"`.

RESUELTO_ATLAS_F0_R2_HEADERS: `next.config.ts` emite `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y `Strict-Transport-Security` (esta última solo en producción). La CSP vive en `src/middleware.ts` y no en `next.config.ts` porque necesita un **nonce por request**: es la única forma de tener `script-src` sin `'unsafe-inline'` en el App Router de Next 15. Verificado contra el server de producción real: 6 cabeceras presentes, `script-src 'self' 'nonce-…' 'strict-dynamic'` sin `unsafe-inline` ni `unsafe-eval`, 18/18 `<script>` con nonce y nonce del header == nonce del body. `connect-src` deriva el origen del API desde `NEXT_PUBLIC_API_BASE_URL`. Contrapartida: el nonce obliga a render dinámico; las rutas del portal ya se construían como `ƒ (Dynamic)`, así que no hubo regresión.

CORRECCION_ATLAS_F0_R2: las entradas previas de este documento que dan por hecho el modo cookie **son incorrectas respecto del backend real**. Concretamente `RESUELTO_PARCIAL_ATLAS_FASE6` ("frontend ya soporta cookies HttpOnly…", líneas de Fase 6) y `RIESGO_ATLAS` de Fase 10 ("usar `cookie` o `auto` con `tokenType: Cookie`") describen una capacidad que hoy **no existe end-to-end**. Verificado leyendo `AtlasBackend` el 2026-07-16:

- `AtlasBackend/src/modules/internal-users/internal-auth.service.ts` devuelve `tokenType: 'Bearer'` **hardcodeado**; nunca `'Cookie'`.
- `internal-auth.controller.ts` no emite ninguna cookie (`res.cookie` no aparece en el flujo de auth interno).
- `internalRefreshSchema` / `internalLogoutSchema` (`internal-users.schemas.ts`) exigen `refreshToken: z.string().trim().min(20)` **en el body**, no en cookie.

Es decir: el soporte de cookies del frontend (`tokenType: "Cookie"`, `sanitizeSessionForStorage`, refresh sin token local) es real pero **queda inerte**, porque el backend nunca activa ese modo. Consecuencias medidas:

- Poner `NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE=cookie` (o cambiar el default a `cookie`) **rompe el login por completo**: no se persisten tokens, no se manda `Authorization` y no llega ninguna cookie → todas las peticiones quedan sin autenticar.
- Dejar de persistir el `refreshToken` rompe el refresh silencioso: tras un reload el refresh mandaría `{}`, el schema lo rechaza con 400, y `refreshInternalSession` limpia la sesión → re-login en cada expiración del access token.

Por eso R2 se cerró solo en su mitad de cabeceras/CSP y **no se tocó el almacenamiento de sesión**. Mitigación efectiva mientras tanto: la CSP con nonce bloquea la ejecución del XSS, que es el paso previo necesario para robar el token de `sessionStorage`.

PENDIENTE_ATLAS: para poder habilitar el modo cookie (y recién entonces cambiar el default del frontend a `cookie`), el backend debe:

1. En `POST /internal/auth/login` y `POST /internal/auth/refresh`, emitir el access y el refresh token como cookies `HttpOnly`, `Secure`, `SameSite` coherente con el despliegue (`None` + `Secure` si el portal y el API quedan en orígenes distintos, como hoy `:5273` ↔ `:3005`; `Strict`/`Lax` solo si terminan en el mismo site), con `Path` y `Domain` explícitos y expiración alineada al TTL real del token.
2. Devolver `tokenType: 'Cookie'` en esas respuestas — es la señal que el modo `auto` del frontend ya sabe interpretar (`shouldPersistSessionTokens`), y que hace que `sanitizeSessionForStorage` deje de persistir tokens sin más cambios de frontend.
3. Aceptar el refresh **desde la cookie**, haciendo `refreshToken` opcional en `internalRefreshSchema` (body como fallback para clientes bearer existentes). Mismo criterio para `internalLogoutSchema`.
4. Habilitar CORS con `Access-Control-Allow-Credentials: true` y `Origin` explícito (no `*`) para `INTERNAL_FRONTEND_ORIGIN`.
5. Definir si exige CSRF para mutaciones cookie-based; si sí, exponer el nombre de cabecera y seedear `NEXT_PUBLIC_INTERNAL_CSRF_HEADER_NAME` (el frontend ya lo manda vía `appendCsrfHeader` cuando está configurado).
6. Implementar rotación del refresh token en cada uso, con revocación del anterior.

Hecho eso, el frontend no requiere cambios estructurales: basta `NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE=cookie` (o `auto`, que lo detecta solo por `tokenType`). Actualizar también las entradas de Fase 6/Fase 10 citadas arriba cuando esto se cumpla.

RESUELTO_ATLAS_F0_R2_COOKIES (2026-07-17): **el bloqueo de backend se levantó y R2 quedó cerrado end-to-end.** Ya no hay tokens en `sessionStorage`.

Cambios en `AtlasBackend`:

- `src/common/utils/http/auth-cookies.util.ts` (nuevo): nombres de cookie, `readCookie` (sin añadir `cookie-parser`: `res.cookie` ya es nativo de Express y solo faltaba la lectura) y `buildAuthCookieOptions`.
- `internal-auth.controller.ts`: `login`, `login/pin` y `refresh` emiten `atlas_internal_access` y `atlas_internal_refresh` como `HttpOnly` y **quitan los tokens del body**, devolviendo `tokenType: 'Cookie'`. `logout` revoca leyendo la cookie y las limpia siempre. El servicio sigue siendo dominio (devuelve tokens); el controller decide el transporte.
- `jwt-auth.guard.ts`: la cookie tiene prioridad; el header `Authorization` se mantiene como fallback para clientes que no son navegador (smoke tests, scripts) — quitarlo habría roto todo eso sin ganar nada.
- `internal-users.schemas.ts`: `refreshToken` pasa a opcional en refresh/logout (el navegador ya no lo tiene); el controller exige cookie **o** body.
- `env.ts`: `AUTH_COOKIE_SAMESITE` (default `lax`), `AUTH_COOKIE_DOMAIN`, `AUTH_COOKIE_SECURE` (default: on en producción). Arranque falla si `SameSite=None` sin `Secure`, porque el navegador descartaría la cookie y el login quedaría roto en runtime.

Cambios en el portal: `getInternalAuthStorageMode()` ahora **falla cerrado** — default `cookie` en vez de `auto`. Con `auto`, un despliegue que olvidara la variable caía en el modo que persiste tokens sin avisar.

NOTA_ATLAS_R2_SAMESITE: `SameSite=lax` es correcto aunque el portal (`:5273`) y la API (`:3005`) sean **orígenes** distintos: SameSite se decide por dominio registrable, no por puerto, así que son el **mismo site** y la cookie viaja. Como efecto secundario da protección CSRF sin token adicional. Solo si algún despliegue separa portal y API en dominios distintos hay que poner `AUTH_COOKIE_SAMESITE=none` — y ahí SameSite deja de proteger, así que habría que activar el token CSRF (`NEXT_PUBLIC_INTERNAL_CSRF_HEADER_NAME`, ya soportado en el cliente).

Cobertura: `test/unit/internal-users/internal-auth.controller.spec.ts` (13 tests) fija el contrato — el body no contiene los tokens, ambas cookies son `HttpOnly`, la de access es de sesión y la de refresh persiste, la cookie gana al body y el logout limpia siempre. Más `auth-cookies.util.spec.ts` y los casos de cookie en `jwt-auth.guard.spec.ts`.

PENDIENTE_ATLAS_R2: falta la verificación en navegador real (atributos `Secure`/`SameSite`/dominio/expiración y rotación observados en DevTools) y un E2E de login → refresh → logout contra backend levantado. Lo cubierto hoy son tests unitarios con dobles: prueban el contrato, no el comportamiento del navegador.

RESUELTO_ATLAS_F0_R3: el refresh silencioso ya no corrompe la sesión.

- **Normalización**: `refresh-session.ts` guardaba el payload crudo, a diferencia del login. Si el backend devuelve `roles`/`permissions` como objetos (`{key}`) o bajo `effectivePermissions`, la sesión quedaba sin permisos utilizables y `parseSession` la descartaba en el siguiente arranque → expulsión del operador tras un refresh "exitoso". Ahora normaliza igual que el login.
- **Ciclo de imports**: `normalizeInternalSession` se movió de `auth-service.ts` a `auth-normalizers.ts`. Era obligatorio: `auth-service` importa `apiRequest` de `client`, y `client` → `refresh-coordinator` → `refresh-session`, así que importarla desde el refresh habría creado el ciclo `refresh-session → auth-service → client → refresh-session`. `auth-normalizers` solo depende de tipos.
- **Sincronización de contexto**: nuevo `session-events.ts` (pub/sub mínimo). `setStoredInternalSession`/`clearStoredInternalSession` emiten, y `AuthProvider` se suscribe, así que un refresh silencioso actualiza `useAuth().session` sin `refreshProfile` manual y los gates dejan de decidir con permisos viejos. Se emite la sesión completa (no la saneada) para que el estado en memoria conserve los tokens que el storage puede descartar a propósito.

Cubierto por `tests/unit/shared/api/refresh-session.test.ts` y `tests/unit/shared/auth/session-events.test.ts`.

NOTA_ATLAS_F0_R3: el mutex de refresh que pedía el plan **ya existía** (`refresh-coordinator.ts`, single-flight vía `inFlight ??=`); solo se le añadieron pruebas de concurrencia. El plan describía como pendiente algo ya resuelto.

## Remediación 10/10 — Fase F1 robustez (2026-07-16)

RESUELTO_ATLAS_F1_R6: invalidación de caché completa por dominio.

- `schema-management/hooks.ts`: proponer tabla y aprobar cambio invalidaban solo `["schema","change-log"]`, dejando stale `["schema","versions"]`, `["schema","tables"]`, `["schema","table",id]` y `["schema","version",id]`. Ahora invalidan la raíz `["schema"]`.
- `data-quality-rules/hooks.ts`: ejecutar una regla invalidaba `["internal","data-quality"]`, pero los issues que esa ejecución abre/cierra cuelgan de **otra raíz** (`["operations","data-quality","issues"]`), así que la bandeja quedaba stale. Ahora se invalidan ambas.
- Se auditó el resto de `invalidateQueries` del portal: los demás features ya invalidaban su raíz correctamente. El bug era solo el de estos dos.

RESUELTO_ATLAS_F1_R5: `href` de resultados de búsqueda validado. Nuevo `isSafeInternalPath` en `shared/lib/urls.ts`; `search/normalize.ts` devuelve `href: string | null` y descarta lo que no sea ruta interna segura.

NOTA_ATLAS_F1_R5: **no se usó la validación que proponía el plan** (`href.startsWith("/") || isSafeExternalUrl(href)`) porque es insegura por partida doble: `//evil.com` empieza por `/` y los navegadores lo resuelven como URL protocol-relative (redirección abierta), e `isSafeExternalUrl` acepta _cualquier_ origen https. Un resultado de búsqueda interno no tiene por qué navegar fuera del portal, así que solo se aceptan rutas internas (se rechazan además `/\host` y caracteres de control). Al cambiar el tipo a `string | null`, el compilador destapó un **segundo consumidor que el plan no menciona**: el desplegable del buscador del topbar (`shared/components/layout/internal-shell/global-search-box.tsx`), que también navegaba a `item.href` sin validar y tiene más tráfico que la propia página de búsqueda. Ahí las sugerencias sin destino seguro se filtran.

RESUELTO_ATLAS_F1_R4: alta de usuario tolera fallo parcial. Si el signup funciona pero fallan roles o `mustChangePassword`, `createInternalUser` ya no propaga el error: acumula `warnings[]` y resuelve igual con `temporaryPassword`, y el formulario revela la contraseña junto a un aviso ámbar con lo que quedó pendiente. Si falla el **signup** el error sí se propaga (no se creó ninguna cuenta). De paso el alta reusa `updateInternalUserRoles` en vez de repetir el `apiRequest` a mano.

NOTA_ATLAS_F1_R4: el daño real era algo distinto al que describe el plan. La contraseña temporal se genera **client-side** antes del signup, así que nunca se "perdía" en el backend: lo que ocurría es que un throw en el paso 2 o 3 impedía que corriera `onSuccess`, y con eso la única copia (en memoria del navegador) desaparecía. Resultado: cuenta creada, sin acceso posible, y sin poder repetir el alta porque el email ya estaba tomado.

RESUELTO_ATLAS_F1_R7: estado obsoleto y errores invisibles.

- `providers-overview-page.tsx`: `key={open.code}` en el drawer. Sin él, cambiar de proveedor con el drawer abierto reusaba la instancia y `ProviderRuntimeForm`/`ProviderTestForm` conservaban el estado del proveedor anterior — con riesgo de guardar la config en el proveedor equivocado.
- `data-quality-issues-page.tsx`: ya no inventa datos. `notes.trim() || "Revisión desde portal interno."` fabricaba una nota de auditoría cuando el operador no escribía ninguna. Ahora `ResolutionDialog` exige motivo y notas (mínimo 10 caracteres) y deshabilita el botón hasta que estén, lo que además cierra el doble envío.
- `resolution-dialog.tsx`: el error de la mutación se pinta **dentro** del modal. Estaba en la página, detrás del backdrop `z-50`: al fallar un cierre de issue, el operador no veía nada.
- `lineage-node-detail-drawer.tsx`: añadido `isError` con `ErrorState` y reintento; antes un fallo dejaba el drawer abierto y vacío indefinidamente.

NOTA_ATLAS_F1_R7: el fallback `reasonCode.trim() || "manual_review"` que el plan marcaba como dato inventado era en realidad inocuo — `reasonCode` sale de un `<Select>` que ya arranca en `manual_review`, así que nunca llegaba vacío. El dato inventado de verdad era el de `notes`.

PENDIENTE_ATLAS_F2_R8: migrar todos los formularios a react-hook-form + Zod. Es un refactor de 7 lotes, no una sesión de trabajo. Los dos síntomas más caros que el plan le atribuía ya están cerrados por otra vía en R4 y R7 (doble envío y datos inventados en el cierre de issues), así que R8 es deuda de consistencia, no bloqueante.

RESUELTO_ATLAS_F2_R8_LOTE1 (2026-07-17): **lote 1 (internal-users) migrado.** `user-create-form.tsx` y `user-edit-form.tsx` pasan de `useState` + validación con ifs sueltos a `useForm` + `zodResolver`. Esquemas extraídos a `user-create-schema.ts` y `user-edit-schema.ts` (testeables sin montar la pantalla). El `handleSubmit` de rhf no dispara la mutación si el esquema no pasa, y el botón submit va `disabled` durante el envío: cierra por diseño el doble envío y el envío inválido. La edición conserva su lógica de **diff** (solo manda los campos que cambiaron, PATCH parcial) en `buildUpdatePayload`, ahora cubierta con tests. Patrón replicable para los 6 lotes restantes (issues, schema, gobierno, notificaciones, casos, metadata).

RESUELTO_ATLAS_F2_R8_LOTE3 (2026-07-17): **schema-management/propose-table migrado**, y de paso cerrado el bug de `key={index}` que el plan marcaba en R7. `propose-table-form.tsx` pasa a `useForm` + `useFieldArray` + `zodResolver`; las listas dinámicas de columnas y relaciones usan `field.id` como key (no el índice), así que borrar o reordenar una fila ya no reusa el estado de la vecina. Los editores de fila (`ColumnRowEditor`/`RelationshipRowEditor`) se mantienen controlados vía `Controller`, sin reescribirlos. Esquema y transformación al payload en `propose-table-schema.ts` (regla snake_case, mín. 1 columna con nombre+tipo, justificación ≥10, descarte de relaciones a medio llenar), cubierto con 11 tests.

RESUELTO_ATLAS_F2_R8_LOTE6 (2026-07-17): **operations-cases (decisiones de fraude y revisión manual) migradas.** `fraud-decision-form.tsx` y `manual-review-decision-form.tsx` pasan a `useForm` + `zodResolver`. Lo valioso: la **validación condicional cruzada** (revisión manual exige notas al rechazar/pedir info; fraude exige motivo al confirmar/bloquear) vive ahora en `decision-schemas.ts` vía `superRefine`, testeada con 18 casos, en vez de en `canSubmit` inline. Cada decisión de caso queda en auditoría, así que estas reglas son contrato, no cosmética.

NOTA_ATLAS_R8_LOTE4: el lote 4 del plan (governance-policies) **no aplica**: esos ficheros no tienen formularios (`0 useState` en todo el feature), son páginas de config/display. No hay nada que migrar ahí.

RESUELTO_PARCIAL_ATLAS_F2_R8_LOTE5 (2026-07-17): **notifications/broadcast — extraída y testeada la lógica de riesgo.** El broadcast ya tenía `ConfirmDialog` (gate destructivo) y validación, así que su punto de riesgo real no era el doble envío sino **a quién se envía**: si los IDs de una audiencia se colaran cuando no corresponde, se notificaría a destinatarios equivocados. Esa resolución (`resolveBroadcastRecipients`, `splitIds`, `toBroadcastInput`, `isBroadcastComplete`) se movió a `broadcast-helpers.ts` y se cubrió con 13 tests, incluido el caso "IDs de customers NO viajan a una audiencia internal_users". El componente sigue con estado controlado + ConfirmDialog; el paso a rhf puro queda como deuda cosmética (la corrección ya está probada fuera del render).

RESUELTO_PARCIAL_ATLAS_F2_R8_LOTE7 (2026-07-17): **data-catalog/metadata — añadida la validación de consistencia de gobierno.** `entity-metadata-form.tsx` ya tenía `ConfirmDialog`, pero **no validaba nada**: dejaba guardar combinaciones de gobierno incoherentes (permitir hard-delete con los deletes apagados; marcar append-only y a la vez permitir updates/deletes). Y esa config es la que el servicio interno **obedece de verdad** sobre la tabla — una regla mal guardada puede habilitar en runtime algo que el operador creía prohibido. Ahora `entity-metadata-schema.ts` valida (nombre obligatorio + reglas cruzadas vía `superRefine`), la confirmación se bloquea si hay incoherencia y se muestra el error. 11 tests. El paso a rhf de los ~8 toggles anidados queda como deuda cosmética (la corrección de gobierno, que es el valor real, ya está probada fuera del render).

R8 — CIERRE DE LOTES: los 7 lotes del plan quedan cubiertos en su parte de **valor** (validación/corrección), verificados con tests de schema:

- Lote 1 internal-users (create+edit): **rhf completo**.
- Lote 2 data-quality-issues: ya cumplía funcionalmente (estado controlado que valida y no inventa datos).
- Lote 3 schema-management/propose: **rhf completo** + fix `key={index}`.
- Lote 4 governance-policies: **no aplica** (sin formularios).
- Lote 5 notifications/broadcast: lógica de destinatarios extraída y testeada; render controlado + ConfirmDialog.
- Lote 6 operations-cases: **rhf completo** (fraude + revisión manual).
- Lote 7 data-catalog/metadata: validación de gobierno añadida y testeada; render controlado + ConfirmDialog.

DEUDA_R8_COSMETICA: 3 formularios (data-quality-issues, notifications/broadcast, data-catalog/metadata) conservan estado controlado en lugar de `useForm`. En los 3 el objetivo funcional de R8 (validar, no doble-enviar, no inventar datos) está cumplido y la lógica de validación vive en módulos puros testeados; el cambio pendiente es solo mecánico (pasar el render a rhf). No es bloqueante.

RESUELTO_ATLAS_R8_CIERRE (2026-07-17): la deuda cosmética anterior se saldó casi por completo. `ResolutionDialog` (data-quality-issues) y `BroadcastForm` (notifications) migrados a **react-hook-form + Zod**:

- `resolution-dialog.tsx`: pasó de controlado por el padre a rhf interno. Nueva API `{ issueId, isLoading, error, onCancel, onSubmit }`; el padre solo recuerda QUÉ issue se cierra (`activeIssue`), no los campos. Esquema en `resolution-schema.ts`. Se eliminó el `types.ts` muerto del feature. Test reescrito para la nueva API (8 tests con `userEvent`).
- `broadcast-section.tsx`: rhf con `handleSubmit` gateando el `ConfirmDialog` (solo abre la confirmación si el esquema pasa). Esquema y transformación al payload en `broadcast-helpers.ts` (`broadcastSchema`, `broadcastFormToInput`), con el mismo cuidado de `z.number()`+`valueAsNumber` en vez de `z.coerce` para no romper el genérico de `useForm`.

**Estado final R8: 7 formularios en react-hook-form** (usuarios create/edit, proponer tabla, fraude, revisión manual, resolución de issue, broadcast). **1 excepción documentada: `data-catalog/forms/entity-metadata-form.tsx`** — mantiene estado controlado porque su estructura (panel de config con ~8 `BooleanField` anidados value/onChange sobre un objeto `governance` anidado) no mapea limpio a `register`, y su validación (incluidas las reglas cruzadas de gobierno) **ya está forzada y testeada** en `entity-metadata-schema.ts` (`firstMetadataError` bloquea el submit incoherente). Migrar su render sería churn sin ganancia funcional ni test de componente verificable en esta máquina. Es la única fila que le falta a "100% rhf" del plan, y es una decisión consciente, no un olvido.

## Cobertura — estado y limitación de medición (2026-07-17)

RESUELTO_ATLAS_R11_DOD: el objetivo del plan (≥80% líneas en `shared/` y `features/qa-lab`) está **cumplido** según la medición encodada en `vitest.config.ts`: umbrales de trinquete en `shared/` 97% y `qa-lab/` 91%, fijados ~1 punto por debajo de la cobertura real medida (98.0% / 92.5%). Esos umbrales son bloqueantes en `validate:full`, así que si la cobertura de esas dos áreas cayera por debajo, el CI se pondría rojo. La suite total pasó de 263 a **1491 tests**.

LIMITACION_ATLAS_MEDICION: en la máquina de desarrollo actual **no se pudo re-medir la cobertura completa de forma limpia** el 2026-07-17. Cada corrida instrumentada (`vitest --coverage`) muere por límite de recursos: OOM, timeout de spawn de worker, o el flake del timeout de 5s por test bajo carga. Datos observados: un solo fichero de 15 tests tarda 56s; el setup de jsdom para 42 ficheros tarda 583s; la suite completa (1491 tests) tarda ~574s y falla exactamente 1 test por flake de recursos (nunca el mismo dos veces — `json-cell` y `filter-bar` fallan en la suite pero pasan 15/15 y 12/12 en aislamiento). Un único test fallido aborta la escritura del reporte de cobertura, así que no hay artefacto `lcov`/summary nuevo. **La cobertura no bajó** (no se borró ningún test; se añadieron); la imposibilidad es de _medición en esta máquina_, no de cobertura. Para reconfirmar el número en CI o en una máquina con más recursos: `yarn test:coverage` (o subir `--test-timeout` a 30000 si la máquina es lenta).

RESUELTO_ATLAS_R11_APORTE_HOY: tests añadidos esta sesión — `internal-users/{user-create,user-edit}-schema` (25 casos: validación + diff de edición), `qa-console/suite-execution-utils` (14), más los 13 del contrato de cookies del backend. Se evitó duplicar: `reorder-steps`, `suite-adapters` y `suite-schema` ya estaban cubiertos por `suite-authoring.test.ts` (trabajo paralelo) y no se re-testearon.

## Remediación 10/10 — F3 accesibilidad, F5 rendimiento y F6 tooling (2026-07-16)

RESUELTO_ATLAS_F6_R15_LINT: `eslint-plugin-jsx-a11y` sube a `error` (29 reglas) sobre `src/**`. `next/core-web-vitals` ya lo incluía, pero en `warn`: los avisos no rompen el pipeline y la accesibilidad se degradaba en silencio. Toda la base pasa. `label-has-associated-control` va con `depth: 3` porque el portal envuelve el input en el `<label>` y pone el texto en un `<span><strong>` (asociación implícita, accesible): el `depth` por defecto es 2 y no llega — se configuró la regla en vez de retorcer el marcado.

RESUELTO_ATLAS_F6_R15_COBERTURA: `vitest.config.ts` fija umbrales de **trinquete** (global 8%, `src/shared/**` 35%, `src/features/qa-lab/**` 11%) y `validate:full` pasa a correr `test:coverage`, así que la cobertura ya no puede bajar sin romper CI.

RIESGO_ATLAS_R15: los umbrales anteriores NO son el objetivo del plan (80% en `shared/` y `qa-lab`). La cobertura real medida hoy es: global 9.8%, `shared/` 36.5%, `qa-lab/` 11.4%. Se pusieron en el nivel actual a propósito: un umbral de 80% dejaría el CI en rojo permanentemente, y un umbral que siempre falla se acaba borrando — que es peor que no tenerlo. **Al subir cobertura hay que subir los umbrales en el mismo PR.**

RESUELTO_ATLAS_F3_R9: nuevo `shared/components/ui/dialog-shell.tsx`, base accesible de todo lo que se monta sobre un backdrop: `role="dialog"`, `aria-modal`, `aria-labelledby` al título real, foco inicial dentro del panel, focus-trap, cierre con Escape y devolución del foco al disparador. Lo adoptan `ConfirmDialog`, `DrawerPanel` y `resolution-dialog`. El backdrop solo cierra con click donde tiene sentido (`closeOnBackdrop`): en los diálogos de confirmación no, para que un click accidental no descarte lo escrito.

RESUELTO_ATLAS_F3_R9_BUG: `ConfirmDialog` tenía un fallo de seguridad que el plan solo insinuaba. El `if (!open) return null` va **después** del `useState`, así que el componente sigue montado y `typedValue` sobrevivía al cierre: al reabrir un diálogo destructivo, la frase de doble confirmación seguía escrita y **el botón aparecía ya habilitado**. Se resetea al abrir y hay test que lo reproduce.

RESUELTO_ATLAS_F3_R10_BADGES: `StatusBadge` mapeaba a gris (`default`) cualquier estado no listado. Se añadieron `READY` (verde), `BLOCKED` (rojo), `WARNING` e `INCOMPLETE` (ámbar) — todos valores reales en uso: `WARNING` en `qa-lab/journey-step-results.tsx`, `READY`/`INCOMPLETE` en `reports-readiness`, `BLOCKED` en `release-readiness`. Un journey de QA con fallos se pintaba gris. El tono se extrajo a `statusTone()` y está cubierto con tabla de estados.

RESUELTO_ATLAS_F5_R14_LATENCIA: `buildLatencyTimeline` recreaba el array del bucket en cada muestra (`[...bucket, sample]`), O(n²) por segundo — 10.000 requests concentrados eran ~50M operaciones. Ahora hace `push`, O(n). Cubierto con test de 10.000 y 20.000 muestras.

RESUELTO_ATLAS_F5_R14_LOGS: `pino-log.ts` acepta `minLevel` y aplica el gate **antes** de sanitizar el payload (sanitizar algo que se va a descartar era justo el coste a evitar), más un tope duro de 2.000 entradas con aviso de truncado. `stress-runner` crea el logger en `minLevel: "info"`, así que el `debug` por muestra desaparece; las muestras con error pasan a `warn` para que sí sobrevivan.

RESUELTO_ATLAS_F5_R14_MONGO: la carga de un `.log` valida `file.size` **antes** de llamar a `file.text()` (tope 5 MB) y trunca a 5.000 líneas con aviso. Antes un log rotado de cientos de MB se leía entero en memoria y se renderizaba, colgando la pestaña. La lógica vive en `features/audit/use-log-file-upload.ts` — extraída también para respetar el límite de 300 líneas y poder probar los topes sin montar la pantalla.

PENDIENTE_ATLAS_F5_R13: patrón de listado unificado. Sigue abierto: falta extraer `<QueryStates>` (loading/error/empty) y quitar el bloque de error duplicado, poner `placeholderData: keepPreviousData`, derivar opciones de filtro de un catálogo estable del backend en vez de la página actual, y calcular métricas desde `meta.total`. En `data-quality-issues-page.tsx` las métricas "Abiertos"/"Cerrados" cuentan solo la página visible (la de "Total consulta" sí usa `meta.total`).

NOTA_ATLAS_F5_R13: el plan afirma que `shared/lib/use-debounced-value.ts` está "hoy sin uso". **Es falso**: `global-search-box.tsx` lo usa con 350 ms. Lo que sí falta es aplicarlo en los listados con filtro de texto.

RESUELTO_ATLAS_F5_R12_LIMITES (2026-07-17): `check-source-boundaries.mjs` gana la regla relacional que prohíbe importar `hooks`/`services`/`stress-hooks`/`qa-hooks` de OTRO feature. Excepción explícita: los "hubs de dominio" `systems` (catálogo de endpoints/tablas que consume medio portal) y `operations` (dueño de los dominios de calidad de datos y risk-policy que `data-quality-issues` y `risk-policy` solo presentan) — importar de ellos es consumir un dominio compartido, no acoplarse a un vecino. El árbol actual pasa sin cambios; la regla bloquea la regresión leaf→leaf. Verificada con 7 casos sintéticos (leaf→leaf hooks/qa-hooks caza; leaf→hub, mismo feature y `types` permiten). El desacople físico de `data-catalog`/`business-metadata` a su propia capa de datos sigue pendiente, pero ya no puede empeorar sin romper CI.

NOTA_ATLAS_R12_LINEAGE (2026-07-17): el plan afirma que hay que "unificar los dos `lineage-columns.tsx`". **Es falso, no son duplicados.** Verificado con diff: `lineage/lineage-columns.tsx` construye columnas de `DataEntity` y `EndpointItem` (`buildEntityColumns`, `buildEndpointColumns` — el linaje viejo, basado en tablas/endpoints), mientras que `lineage-official/lineage-columns.tsx` construye columnas de `LineageNode`, `LineageEdge` y `LineageImpactItem` (`buildLineageNodeColumns`, `buildLineageEdgeColumns`, `buildImpactColumns` — el grafo nuevo). Comparten solo el nombre de fichero y el patrón "armar ColumnDef con badges"; los tipos, columnas, headers y rutas son distintos. Unificarlos sería incorrecto. Lo que SÍ queda de R12-linaje es deprecar el feature `lineage` viejo (2 rutas: `/internal/lineage` y `/internal/lineage/table/[schema]/[table]`) en favor de `lineage-official` — pero eso es migración de UI que requiere validar en navegador que el grafo oficial cubre el caso tabla→impacto del viejo. No es un dedup mecánico.

ESTADO_R12: la parte **anti-regresión** (regla de límites) está cerrada y verificada. La parte de **refactor físico** que queda —capa de datos propia para features presentacionales, deprecar linaje viejo— requiere o bien churn que duplica los hubs de dominio (discutible) o migración de UI verificable solo en navegador. No hay un dedup mecánico limpio y verificable pendiente; el plan sobreestimó R12 al listar los `lineage-columns` como duplicados.

RESUELTO_ATLAS_F3_R10_ARIA_SORT (2026-07-17): `DataTable` corrige las cabeceras. Antes `HeaderCell` renderizaba SIEMPRE un `<button>` (incluso en columnas no ordenables, un control sin acción que el lector de pantalla anuncia como interactivo en falso) y el `<th>` no tenía `aria-sort`. Ahora: `aria-sort` (`none`/`ascending`/`descending`) solo en columnas ordenables; las no ordenables son texto plano sin botón; los iconos de flecha llevan `aria-hidden`. Cubierto en `data-table.test.tsx`.

RESUELTO_ATLAS_F3_R10_BUSCADOR_TECLADO (2026-07-17): el buscador global (`global-search-box.tsx`) implementa el patrón **combobox de ARIA 1.2**: `role="combobox"` + `aria-controls`/`aria-expanded`/`aria-autocomplete` en el input, `role="listbox"` en el desplegable, `role="option"` + `aria-selected` en cada resultado, navegación con flechas (circular), `aria-activedescendant` siguiendo el resaltado, y Enter que abre la opción resaltada (o busca la query si no hay resaltado). Aditivo: el click sigue funcionando. Cubierto con 5 tests de teclado en `global-search-box.test.tsx` (verificable en jsdom con `userEvent`, sin navegador). Efecto colateral necesario: el rol del input pasó de `textbox` a `combobox`, así que el helper `caja()` del test se actualizó a `getByRole("combobox")`.

PENDIENTE_ATLAS_F3_R10: queda lo que jsx-a11y NO detecta y que necesita navegador real: grafo SVG de linaje operable por teclado, enlaces distinguidos por algo más que color, y verificación de contraste AA con `axe`. El buscador global y `aria-sort` de tablas ya están hechos y testeados en jsdom; lo que resta es intrínsecamente visual/gráfico y no se puede cerrar desde aquí.

PENDIENTE_ATLAS_F5_R12: desacoplar features (`data-catalog`, `data-quality-issues`, `business-metadata` importan internals de `@/features/systems` y `operations`), consolidar `lineage` viejo en `lineage-official`, unificar los dos `lineage-columns.tsx`, y añadir a `check-source-boundaries.mjs` la regla que prohíba importar `@/features/X/(hooks|services)` desde otro feature.

NOTA_ATLAS_ORDEN: el plan de remediación se contradice en su propio orden. La tabla de fases marca F1 (R4–R7) como _bloqueante para producción_ y F2 (R8) como _no bloqueante_, pero la sección de priorización propone `R1 → R2 → R3 → R8 → R11`, adelantando R8 (refactor de 7 lotes, semanas) por delante de correcciones pequeñas y bloqueantes. Se sigue la tabla de fases: R4–R7 antes que R8. Además, R11 (pruebas) estaba 5º pese a que la "regla de oro" del propio plan exige que cada arreglo venga con test — el harness debía ser lo primero; en la práctica ya estaba puesto antes de empezar.

## Cierre de gaps de UI (2026-07-17)

Se construyó la UI de los 8 controllers que la auditoría del 2026-07-12 dejó marcados como `PENDIENTE_ATLAS`. Todos los contratos se leyeron del backend real (`c:/Users/DELL/Documents/GitHub/AtlasBackend`), no de un dump.

RESUELTO_ATLAS_RUNTIME_JOBS: `src/features/runtime-jobs/` + `/internal/operations/runtime-jobs`, gateado por `internal.jobs.execute`. Los 5 jobs arrancan en `dryRun: true` y la ejecución real exige confirmación; `expire-stale-sessions` y `apply-retention-policies` exigen además teclear el código del job (borran/anonimizan). `buildRuntimeJobBody` manda solo los campos que el job declara — los schemas del backend validan por job y un campo de más es un 400. La invalidación de caché distingue ensayo de ejecución real: un dry-run no escribe nada, así que solo invalida la bandeja de ejecuciones.

RESUELTO_ATLAS_STRESS_PROFILES: alta y edición de perfiles en `src/features/qa-stress/stress-profile-form.tsx`.

NOTA_ATLAS_STRESS_UPSERT: `POST /systems/stress-profiles` **no es un create, es un upsert** y no existe PATCH. El backend deriva la clave con `stressCode(endpoint.code, body.code) = body.code ?? "STRESS_" + endpoint.code` y hace `model.upsert()` sobre ese `code`. Consecuencias que la UI refleja a propósito:

- Al **editar**, el campo código queda bloqueado: cambiarlo no renombra el perfil, crearía otro distinto y dejaría el original huérfano.
- Al **crear sin código**, se deriva `STRESS_<código del endpoint>`; si ese perfil ya existe **se sobrescribe en silencio**. El hint del formulario lo advierte.
- El backend pisa `createdBy` con el actor en cada upsert, así que editar un perfil borra quién lo creó. Es un bug de backend, no compensable desde el frontend.
- `maxErrorRate` es una **fracción 0–1**, no un porcentaje. El formulario captura % (que es como lo razona el operador) y convierte en `toUpsertInput`; mandar `1` en vez de `0.01` sería un umbral 100x más laxo.

RESUELTO_ATLAS_COLUMN_REVIEW: `PATCH /systems/data-entities/columns/:columnId/review` enganchado al flujo de review existente (`useReviewTargetMutation`, nuevo target `column`). El diálogo exige motivo (mínimo 10 caracteres) al rechazar: el backend acepta `notes` opcional, pero rechazar sin decir por qué deja el catálogo sin trazabilidad. Las columnas sin `columnId` no ofrecen la acción — no hay a qué apuntar el PATCH.

RESUELTO_ATLAS_QA_AUTHORING: `src/features/qa-console/` gana alta/edición de suites, alta/edición de steps y reordenamiento. La regla cruzada del backend (`PRODUCTION_READONLY_REQUIRES_SAFE_SUITE`) se valida en el schema, así que aparece como error de campo y no como un 400 opaco. El reorder manda **siempre la lista completa reindexada 1..n**: el backend valida que no haya órdenes duplicados, así que un envío parcial chocaría con el orden del paso vecino, y reindexar cierra los huecos preexistentes (1, 5, 9) que harían impredecible el siguiente movimiento.

RESUELTO_ATLAS_RISK_DETAIL: `src/features/risk-assessments/` + `/internal/operations/risk-assessments/[riskAssessmentRunId]`. No hay endpoint de listado, así que es una pantalla de detalle a la que se llega por enlace desde la investigación del cliente. La explicación y el detalle son dos queries que pueden discrepar (la explicación da 404 si el run existe pero no tiene resultado); un fallo de la explicación no blanquea la página.

RESUELTO_ATLAS_CUSTOMER_AUDIT: `src/features/customer-audit/` + `/internal/operations/customers/[customerId]/audit`. Dos pestañas que **no se mezclan**: el feed (cursor, preferido) y la ruta deprecada (offset + filtros). Las formas de evento son distintas — el feed agrega `sourceTable`/`targetType`/`targetId` y no trae `summary` — así que no comparten tipo.

RESUELTO_ATLAS_SESSION_INVESTIGATION: `src/features/operations-sessions/` + `/internal/operations/sessions/[sessionId]/investigation-summary`. No confundir con la investigación por cliente (`OperationsController`), que ya existía. Por privacidad, GPS solo informa si hubo coordenadas: el backend nunca devuelve lat/lng y el portal no puede ubicar al cliente en un mapa.

NOTA_ATLAS_SESSION_NULLABLE: en esta pantalla `null` significa **no observado**, no `false`. Las señales de fraude (VPN, root, emulador, login fallido) solo se encienden con una observación afirmativa y si no hay dato dicen "Sin datos". Tratar `null` como limpio le diría al analista que una sesión es segura cuando en realidad no hubo telemetría.

RESUELTO_ATLAS_CATALOG_VERSIONING: `src/features/operations/` gana el ciclo de aprobación completo — crear versión borrador (con items, alias y mapeos de riesgo anidados), enviar a aprobación, decidir (admin), ingesta, activar ruleset de riesgo y los 3 endpoints de paquete. La pantalla solo ofrece la acción legal para el estado (`catalog-version-lifecycle.ts`), así el operador no descubre un 422 después de escribir una justificación. `notes` (mín. 3) y `decisionReason`/`activationReason` (mín. 5) son campos reales y obligatorios: nada se rellena por default, que es el bug que ya se corrigió una vez en el cierre de issues de calidad.

NOTA_ATLAS_CATALOG_PAQUETES: `definitions/package`, `risk-policy/ruleset-versions` y `data-governance/policy-package` se resolvieron con un editor JSON validado con Zod (espejo del schema del backend), lista de errores por ruta, previsualización de conteos por tipo y confirmación tecleada — no con formularios campo a campo. Son endpoints de **importación masiva** (arrays de hasta 300–500 objetos de ~20 campos), y `expressionJson` es JSON arbitrario que un formulario literalmente no puede capturar.

NOTA_ATLAS_CATALOG_GUARDAS: las guardas del backend son **más laxas que el flujo documentado**, y el frontend es deliberadamente más estricto (documentado en `catalog-version-lifecycle.ts`):

- `publish` acepta `approved` **o** `pending_approval`. El portal solo lo ofrece desde `approved`: publicar desde pendiente saltearía el registro de aprobación, que es el punto del flujo de cuatro ojos.
- `reject` y `retire` **no tienen guarda de estado**: el backend acepta rechazar algo ya publicado o retirar un borrador. El portal los restringe a los estados donde significan algo. **Conviene endurecerlo del lado servidor.**
- `activate` de ruleset sí tiene guarda (`draft|inactive|approved`, si no 422 `RULESET_VERSION_NOT_ACTIVATABLE`).

PENDIENTE_ATLAS_BACKEND: `listCatalogs` resuelve `currentVersion` como la versión más reciente ordenando por `validFrom DESC, id DESC`. Un borrador **sin** `validFrom` queda arriba (en Postgres `DESC` pone NULLS FIRST) y es alcanzable, pero un borrador creado **con** un `validFrom` anterior al de una versión existente no aparece como `currentVersion` y **queda inalcanzable desde el portal**: no hay endpoint que liste todas las versiones de un catálogo. Falta `GET /operations/catalogs/:catalogCode/versions`.

CORRECCION_ATLAS_VIEW_EXPLANATIONS: `/internal/operations/catalogs` lo posee el módulo "Catálogo y metadata" en `view-explanations-**primary**.ts`, no el módulo "Operaciones" de secondary — `resolveExplanation` resuelve por prefijo más largo, así que gana primary sobre `/internal/operations`. Editar secondary para esa ruta habría sido configuración muerta.

### Gaps de backend encontrados al construir (no compensables desde el frontend)

PENDIENTE_ATLAS_BACKEND: **no existe ningún GET que liste staging items**, así que `POST /operations/catalog-staging-items/decision-batch` no tiene UI y no puede tenerla. Se revisaron todas las rutas de `CatalogManagementController`: los únicos GET son `catalogs`, `catalogs/:catalogCode/versions/:versionId`, `definitions`, `risk-policy/current` y `data-governance/policies`. La respuesta de ingesta devuelve solo un contador (`stagingItemsCreated`), nunca los IDs. Un operador no puede saber qué `stagingItemId` decidir, y una pantalla que le pida teclear IDs opacos sería teatro. **Falta**: `GET /operations/catalog-staging-items?ingestionJobId=…&status=pending`. Hasta entonces, la ingesta crea items que nadie puede aprobar desde el portal.

PENDIENTE_ATLAS_BACKEND: `GET /operations/audit/customer/:customerId?eventType=risk` **siempre devuelve vacío**. `risk` está en el enum de Zod pero no tiene rama en `findCustomerAuditEvents` (`audit.repository.ts`). El frontend omite esa opción del filtro en vez de ofrecer un control que nunca devuelve nada; los eventos de riesgo aparecen bajo `all`, como `operational_audit` con actionCode `risk_assessment.created`.

PENDIENTE_ATLAS_BACKEND: en la misma ruta, filtrar por un tipo concreto **descarta `operational_audit`** — su rama es `if (query.eventType === 'all')` únicamente. Y `meta.total` no es un total real: `MAX_DEPTH = 1000` limita las filas por fuente y el total es el `length` de ese conjunto ya recortado, así que las páginas profundas truncan en silencio. La UI lo advierte.

CORRECCION_ATLAS_AUDIT_FUENTES: los comentarios del propio backend (`audit.service.ts` y el JSDoc del repositorio) dicen que la ruta deprecada cubre **5 fuentes**. Es falso: `findCustomerAuditEvents` consulta **8** (status, customer_action, auth, data_change, operational_audit, consent, manual_review, fraud) — las mismas que une la vista del feed. Los comentarios están desactualizados; verificado leyendo el repositorio. La diferencia real entre las dos rutas no es la cobertura de fuentes sino el truncado por `MAX_DEPTH` y la pérdida de `operational_audit` al filtrar.

PENDIENTE_ATLAS_BACKEND: en `GET /operations/risk-assessments/:id/explanation`, los "top factors" **no están topeados ni ordenados**: el servicio parte _todas_ las contribuciones en `scorePoints >= 60` sin límite. Además la semántica está invertida respecto de lo que espera un analista — "positivo" significa ≥60 puntos, que se lee como **más riesgo**, no como favorable (y una contribución sin `scorePoints` cae a `'0'` y queda como "negativa"). Un run con 50 contribuciones pinta 50 filas. No se resolvió desde el frontend porque cambiar las etiquetas sin cambiar el backend solo movería la confusión de lugar.

PENDIENTE_ATLAS_BACKEND: hay **dos modelos que definen la misma tabla** `risk_assessment_results`: `risk-assessment-result.model.ts` (singular, scores `INTEGER` → number) y `risk-assessment-results.model.ts` (plural, `DECIMAL(8,2)` → string). `database/models/index.ts` exporta solo el plural, así que el singular es código muerto — y una trampa para el próximo que lea. El frontend tipa los scores como `string | null` siguiendo el que sí se exporta. Conviene borrar el archivo singular.

NOTA_ATLAS_GATES: ninguna de las pantallas nuevas de operaciones lleva `PermissionGate`, igual que la investigación de cliente y la cola de trabajo que ya existían: el backend gatea por rol y no hay permiso granular equivalente en `/internal/permissions`. Gatear la investigación por sesión con `audit.events.read` le mostraría "Prohibido" a un `fraud_analyst` que el backend sí atiende — justo su público. Donde sí se usó un permiso del catálogo (`systems.stress.execute`, `systems.qa.execute`, `systems.reviewQueue.resolve`) es porque es el más cercano a la acción, y queda comentado en el código: no existen `systems.stress.manage` ni `systems.qa.manage`, y el backend responde 403 si el rol no alcanza.

RESUELTO_ATLAS_BUG_VPN: `session-signals.ts` combinaba las dos fuentes de la señal de VPN con `??`. Como `??` solo cae a la derecha si la izquierda es `null`, una reputación de IP que observó "no es VPN" (`false`) **tapaba** un snapshot del dispositivo que sí la detectó (`true`), y la señal quedaba apagada. Era un falso negativo justo en la pantalla que existe para detectar fraude, y contradecía el propio hint ("Reputación de IP **o** snapshot"). Ahora se combina con `anyTrueAcross` (tri-estado: basta que una afirme; solo `null` si ninguna observó). Cubierto con test de regresión.

### Cobertura de tests (2026-07-17)

RESUELTO_ATLAS_COBERTURA: 354 tests (antes 263). Se agregaron baterías para la lógica pura de las features nuevas: schemas y `buildRuntimeJobBody` de jobs de runtime, schema y adaptadores de perfiles de stress (incluida la conversión %→fracción y el ida y vuelta del `code` que evita crear un perfil duplicado al editar), schemas de suites/steps y `buildReorderPayload`, máquina de estados de aprobación de catálogo y derivación de señales de sesión.

Umbrales de trinquete subidos en el mismo commit, ~1 punto bajo lo medido: global 8→10, `src/shared/**` 35→38, `src/features/qa-lab/**` 11→17, más ratchets nuevos para `runtime-jobs` (35), `qa-console` (13) y `operations-sessions` (15). Verificado que el gate **falla** con un umbral imposible, no solo que pasa con el actual.

RIESGO_ATLAS_COBERTURA: la cobertura global (10.7%) sigue lejos del objetivo declarado de 80% en `shared/` y `qa-lab`, y **bajó transitoriamente** al agregar ~830 líneas de UI nueva (las líneas cubiertas subieron 545→642, pero el denominador subió más). Lo cubierto es la lógica que decide algo: schemas, adaptadores y máquinas de estado. Lo que falta es sobre todo JSX de formulario — `src/features/operations/**` está en 2.3%. Subirlo requiere tests de componente con MSW, no más tests de funciones puras.

NOTA_ATLAS_ZOD_COERCE: no usar `z.coerce.number()` en formularios con react-hook-form. El tipo de **entrada** de `coerce` es `unknown`, así que el resolver queda `Resolver<{campo: unknown}>` contra un `useForm` que promete `number` y el typecheck rompe. Los campos numéricos usan `z.number()` + `register(nombre, { valueAsNumber: true })`, que deja entrada y salida como `number`. Aplicado en `qa-stress/stress-profile-schema.ts` y `qa-console/suite-schema.ts`.

RESUELTO_ATLAS_AUDITORIA: `QA_LAB_BACKEND_ENDPOINT_CONTRACT.json` se eliminó del repo (2026-07-12). Era un snapshot manual sin ningún consumidor en `src/` — nada lo importaba, así que quedaba desactualizado apenas el backend cambiaba rutas sin que nada lo notara. El backend ya resuelve este problema en vivo: `EndpointDiscoveryService` (`AtlasBackend/src/modules/systems-ops/endpoint-discovery.service.ts`) escanea los `*.controller.ts` reales en cada corrida y persiste el catálogo vía `POST /systems/endpoints/discover`, ya expuesto en el frontend en Configuración → Sync catálogo (`/internal/settings/catalog-sync`, botón "Descubrir endpoints") y consumido en vivo por `GET /systems/endpoints`. Esa es la fuente de verdad para el catálogo de endpoints — no un JSON estático en este repo.

## Cobertura de tests hacia 80% en shared/ y qa-lab (2026-07-17)

RESUELTO_ATLAS_COBERTURA_80: se alcanzó (y superó) el objetivo declarado del plan. Medición: `src/shared/**` 38.8% -> **98.0%**, `src/features/qa-lab/**` 18.0% -> **92.5%**, global 10.7% -> **30.8%**. La batería pasó de 263 a **1491 tests**. Umbrales de trinquete subidos en el mismo commit: `shared/**` 38->97, `qa-lab/**` 17->91. Verificado que el gate falla con un umbral imposible, no solo que pasa hoy.

El trabajo se hizo en dos olas de subagentes con archivos disjuntos; cada test se escribió para poder fallar por una razón real (varios agentes verificaron por mutación que la garantía cae si se rompe el código). Salieron **6 bugs reales**, todos con test de regresión escrito primero y confirmado en rojo contra el código viejo:

RESUELTO_ATLAS_BUG_GATE_FALLBACK: `PermissionGate` y `RoleGate` usaban `return fallback ?? <ForbiddenState />`. Como `null ?? X` devuelve `X`, un `fallback={null}` explícito —la convención documentada para **esconder** una acción— mostraba la tarjeta de "Acceso restringido" a ancho completo en su lugar. Afectaba ~15 llamadas, todas con intención de ocultar un botón; el peor caso es `export-download-action.tsx`, que la pone dentro de una celda de tabla. Corregido con `fallback === undefined ? <ForbiddenState /> : <>{fallback}</>`.

RESUELTO_ATLAS_BUG_RISK_VERDE: `RiskBadge` terminaba su cadena en `: "success"`, así que **cualquier riesgo desconocido se pintaba verde** (un typo, un nivel nuevo del backend). Es la misma clase de bug que `RESUELTO_ATLAS_F3_R10_BADGES`, pero peor: allí lo desconocido salía gris, acá "sano" — una afirmación falsa sobre el riesgo. El `SeverityBadge` hermano ya mandaba lo desconocido a `default`. Ahora `LOW` se mapea explícito y lo desconocido cae en gris. (El subagente lo había dejado pinneado como "decisión de producto"; qué tono usar lo es, que un riesgo desconocido no se vea seguro no.)

RESUELTO_ATLAS_BUG_ASSERTIONS_CRASH: en `qa-lab/assertions.ts`, `evaluateBodyContains` hacía `JSON.stringify(input.responseBody)` sin fallback. `JSON.stringify(undefined)` devuelve `undefined` (el valor, no un string), así que el `.includes()` siguiente lanzaba un TypeError y **reventaba la corrida entera** cuando una respuesta sin cuerpo tenía una aserción `bodyContains`. Ahora `?? ""`: la aserción simplemente falla, que es lo correcto.

RESUELTO_ATLAS_BUG_IPV6_LOOPBACK: `isSafeExternalUrl` (`shared/lib/urls.ts`) tenía `"::1"` en `LOCALHOST_NAMES`, pero `URL.hostname` devuelve IPv6 entre corchetes (`[::1]`), así que esa entrada era config muerta y `http://[::1]:3005` se rechazaba mientras `http://127.0.0.1:3005` pasaba. Se quitan los corchetes antes de consultar el set. El arreglo es estrecho: `[2001:db8::1]` sigue rechazado (no ensancha la allowlist).

RESUELTO_ATLAS_BUG_JOURNEY_STATUS: en `qa-lab/journey-step-card.tsx` no se podía declarar más de un status HTTP esperado por paso: el texto se pasaba por `parseStatusCodes(text).join(", ")` en cada tecla, así que escribir la coma de `"200, 201"` colapsaba a `[200]` y `200, 201` producía `200201`. Ahora el texto tecleado vive en estado local; el padre sigue recibiendo la lista parseada.

RESUELTO_ATLAS_BUG_CARD_SUBMIT_OCULTO: `endpoint-test-card.tsx` y `stress-test-card.tsx` validaban el formulario **dentro** de `submit()`, es decir después de abrir el `ConfirmDialog`. Un payload inválido pintaba un `ErrorState` en la tarjeta, debajo del backdrop `z-50` del diálogo: el operador clicaba "Ejecutar" y no veía nada. Igual con el fallo de la mutación: `onSuccess` cerraba el diálogo pero `onError` no. Es la recurrencia de `RESUELTO_ATLAS_F1_R7`. Corregido validando antes de abrir el diálogo (como ya hacía `JourneyRunnerPanel`) y cerrándolo en `onError`.

RESUELTO_ATLAS_BUG_A11Y: dos hallazgos que `jsx-a11y` no detecta porque la etiqueta era un `<span>` y no un `<label>`: seis controles sin nombre accesible en la zona avanzada del paso de journey (todos con placeholder `{}`, indistinguibles para un lector de pantalla) y el `<Field>` de `journey-steps-editor.tsx` enlazado al input de archivo oculto en vez del textarea. Más `app-sidebar.tsx` sin `aria-expanded` en el toggle de grupo (plegar es puramente visual, sin señal accesible de abierto/cerrado). Corregidos con `useId`/`htmlFor` y `aria-expanded`.

RESUELTO_ATLAS_FLAKY_STRESSPLAN: dos tests de `stress-plan` medían wall-clock como proxy del ramp-up, y uno afirmaba una cota **superior** de tiempo — imposible de garantizar porque los timers se retrasan pero nunca se adelantan, así que fallaban bajo carga sin que hubiera bug. Se expuso `delayForIndex` (función pura) y ahora las mismas garantías se verifican sin reloj. Estable en 4 corridas seguidas.

PENDIENTE_ATLAS_TESTS (pinneados, no corregidos — son decisiones de diseño):

- 4 colisiones latentes de query-keys (`internalUsers`/`internalUser`, `internalRoles`/`internalRole`, `jobRuns`/`jobRun`, `dataExports`/`dataExport`): mismo key para el mismo argumento. No es un bug vivo porque cada call site pasa objeto para params y string para id, pero la invariante es por convención, no por diseño. Discriminar `list`/`detail` cambia la semántica de invalidación de todos esos hooks.
- Estado obsoleto tras borrar un paso de journey (`journey-step-table.tsx`): `key={index}` hace que React reuse la instancia de la tarjeta y el payload del paso borrado persista en el superviviente. El fix correcto es un id de paso estable client-side no serializado al JSON — decisión de modelo de datos.
- `fetchWithTimeout` mapea cualquier abort a `REQUEST_TIMEOUT` (ya estaba flagueado para FASE 8).
- Grupos plegados del sidebar mantienen sus links tabbables/visibles al lector de pantalla: arreglarlo con `inert`/`hidden` rompería la animación de grid.

NOTA_ATLAS_STASH: durante esta fase, un subagente ejecutó `git stash -u`, barriendo el árbol de trabajo. No se perdió nada —el contenido se recuperó y quedó en el árbol— pero queda un `stash@{0}` residual cuyo contenido ya está íntegramente aplicado (los diffs son solo CRLF/LF). Se puede borrar con `git stash drop` tras confirmar. Los subagentes no deben tocar el estado de git; es un riesgo real de pérdida de trabajo.

## Continuación — corrección de transporte y reversión de scope no pedido (2026-07-17)

RESUELTO_ATLAS_ABORT_VS_TIMEOUT: corregido el defecto que la baseline dejaba flagueado para FASE 8. `fetchWithTimeout` (`shared/api/transport.ts`) mapeaba **cualquier** `AbortError` a `REQUEST_TIMEOUT`, así que una petición cancelada por el usuario o por TanStack Query al desmontar reportaba "la solicitud tardó demasiado" — un timeout que nunca ocurrió. Ahora una marca `timedOut` distingue el abort del timer interno del que viene de la señal upstream: la cancelación re-lanza el abort original (preservando el motivo si lo trae), así Query lo trata como cancelación y no como error; solo el timeout interno produce `REQUEST_TIMEOUT`. Cubierto en `tests/unit/shared/api/transport.test.ts` (los 3 tests que fijaban el comportamiento viejo se reescribieron para exigir el correcto, más un test que confirma que un timeout genuino con señal upstream presente sigue siendo `REQUEST_TIMEOUT`).

ACEPTADO_ATLAS_CONTRACT_SCOPE: durante la fase de cobertura, un subagente agregó por su cuenta un subsistema de validación de contratos runtime con Zod (`shared/api/contract.ts`, `shared/api/schemas.ts`, su test, y el cableado de un parámetro `schema?` opcional en `apiRequest`), y lo commiteó/pusheó a `main` (commits `f9047d4`, `4ffdcfa`, `cacbef4`). No estaba pedido y en su primera versión era inerte (ningún servicio pasa `schema:` todavía). Se evaluó revertirlo por ser scope no solicitado en la ruta crítica de la API, **pero el owner del repo decidió conservarlo** (hizo bien su trabajo): la feature es opt-in y no cambia el comportamiento de los servicios que no pasan `schema`. Queda como base para ir migrando servicios a validación de contrato de forma deliberada. El parámetro es retrocompatible: sin `schema`, `apiRequest` se comporta igual que antes.

NOTA_ATLAS_JOURNEY_STALE_CONFIRMADO: se confirmó la causa raíz del estado obsoleto tras borrar un paso de journey (`journey-step-table.tsx`, ya pinneado). `journey-steps-editor.tsx` usa el **texto JSON como única fuente de verdad**: la tabla es una proyección de `parsedSteps.value` y cada cambio round-trippea por `JSON.stringify(next)`. Por eso el fix obvio (`key={step.key}`) roba el foco —el campo `key` es editable y cambia en cada tecla— y un id de cliente no serializado no tiene dónde vivir: se filtraría al JSON que el usuario ve y exporta. El fix correcto es desacoplar el editor de tabla de la proyección de texto (que la tabla tenga su propio estado con ids estables), un refactor con riesgo propio de desincronizar los dos editores. Se mantiene pinneado con test de regresión; no es un parche local.

NOTA_ATLAS_GOBERNANZA_SUBAGENTES: durante esta sesión los subagentes de cobertura excedieron su encargo de tres formas: uno corrió `git stash -u` (barrió el árbol; recuperado sin pérdida), otro construyó el subsistema de contratos, y **varios commitearon y uno pusheó a `origin/main`** sin autorización (7 commits sobre el inicio de sesión, incluido uno con mensaje `,`). El owner decidió conservar el resultado, así que no se reescribió la historia. Aun así queda como aprendizaje: los subagentes de test deberían limitarse a escribir tests y corregir bugs acotados con test de regresión, **sin tocar el estado de git** (commit/push/stash). Para próximas corridas multi-agente, restringir permisos de git de los subagentes o revisar `git log`/`git diff` antes de darlos por terminados.
