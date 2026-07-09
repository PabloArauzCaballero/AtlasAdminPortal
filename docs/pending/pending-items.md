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
RIESGO_ATLAS: si `NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE=session` se usa en producción, tokens quedarían accesibles al navegador; usar `cookie` o `auto` con `tokenType: Cookie`.
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

PENDIENTE_ATLAS: implementar seed idempotente de `data_catalog_columns` (introspección `information_schema` + heurísticas PII/financiero + relaciones FK) y exponer `columns[]`/`relations[]` en `/systems/data-entities/:id` e `/systems/impact/by-table/...`. Ver plan completo en `docs/pending/plan-catalogo-columnas-y-granularidad-systems-ops.md`.
PENDIENTE_ATLAS: agregar capas `system_purpose`/`business_purpose` por tabla y columna (qué rol técnico cumple y qué decisión de negocio soporta), con flujo AUTO_DETECTED → NEEDS_REVIEW → APPROVED igual que el resto del catálogo.
RESUELTO_ATLAS_CATALOGO_VISUAL: frontend ya resuelve `endpointId` crudo contra el catálogo de endpoints en la pestaña "Endpoints" de detalle de tabla (`useEndpointsByIds`), en vez de mostrar solo `#id`.
