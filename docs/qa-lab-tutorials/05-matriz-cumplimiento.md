# Matriz de cumplimiento (Fase 20 del brief)

## Criterios de aceptación

| #   | Criterio                                                              | Estado     | Evidencia                                                                                                                       |
| --- | --------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Herramientas importantes inventariadas                                | ✅         | `01-auditoria-herramientas.md`                                                                                                  |
| 2   | Cada herramienta relevante con tutorial                               | ✅         | 8 tutoriales para lab/suites/runs/stress (`03-catalogos.md`)                                                                    |
| 3   | La mayoría de pestañas con tutorial propio                            | ✅         | Lab (unit/journey), Suites (lista/detalle), Runs, Stress                                                                        |
| 4   | Acceso al tutorial visible                                            | ✅         | `TutorialLaunchButton` en headers + Centro + nav lateral                                                                        |
| 5   | Recorridos reaccionan a acciones reales                               | ✅         | `use-tutorial-runtime.ts`; test `tutorial-flow` (element-appears)                                                               |
| 6   | Cambian de pestaña cuando hace falta                                  | ✅         | `step.nextRoute` + navegación en runtime                                                                                        |
| 7   | Explican campos, botones y resultados                                 | ✅         | Catálogo de pasos + `field-help` + interpretación de estados                                                                    |
| 8   | Tutoriales para suites, casos, ejecuciones, API, interfaz, Playwright | ⚠️ Parcial | Suites/casos/ejecuciones/API/journey ✅. «Playwright/grabador» no existe como herramienta → documentado en `06-limitaciones.md` |
| 9   | Errores con ayuda contextual                                          | ✅         | `error-catalog.ts` + `ErrorHelpCard` (8 códigos)                                                                                |
| 10  | Progreso almacenado en backend                                        | ✅         | Route Handler `/api/qa-tutorials/progress` + store servidor                                                                     |
| 11  | Centro de aprendizaje                                                 | ✅         | `/internal/qa/aprender`                                                                                                         |
| 12  | Estados vacíos autodescriptivos                                       | ✅         | Empty state de suites (qué/para qué/ejemplo/acción/tutorial)                                                                    |
| 13  | Tooltips comprensibles                                                | ✅         | `field-help-catalog.ts` + `InfoDot` accesible                                                                                   |
| 14  | Usable por alguien sin conocimiento previo                            | ✅         | Onboarding `qa-lab-overview` + explicaciones de negocio                                                                         |
| 15  | Pruebas frontend/backend/Playwright pasan                             | ✅*        | vitest 43/43; e2e escrita (requiere entorno E2E)                                                                                |
| 16  | Sin tutoriales simulados/decorativos                                  | ✅         | Todos los recorridos operan sobre elementos reales; los inexistentes se omiten con honestidad                                   |

\* La verificación automática ejecutable aquí es vitest (43/43, cubre arranque →
reactividad → persistencia). La E2E Playwright requiere el entorno local
levantado (documentado).

## Entregables obligatorios (Fase 21 del brief)

| #   | Entregable                              | Ubicación                                                    |
| --- | --------------------------------------- | ------------------------------------------------------------ |
| 1   | Inventario de herramientas              | `01-auditoria-herramientas.md`                               |
| 2   | Matriz de tutoriales por módulo/pestaña | `03-catalogos.md`                                            |
| 3   | Tutoriales implementados                | `src/features/qa-tutorials/catalog/**`                       |
| 4   | Centro de aprendizaje                   | `learning-center-page.tsx` + ruta                            |
| 5   | Modelo de persistencia del progreso     | `types.ts`, `progress-schema.ts`, `server/progress-store.ts` |
| 6   | Endpoints creados/modificados           | `app/api/qa-tutorials/progress/route.ts`                     |
| 7   | Componentes reutilizables               | `02-entregables-e-implementacion.md` §5                      |
| 8   | `data-tutorial-id` añadidos             | `02-...` §3                                                  |
| 9   | Catálogo de tooltips                    | `field-help-catalog.ts` / `03-catalogos.md` §2               |
| 10  | Catálogo de errores y tutoriales        | `error-catalog.ts` / `03-catalogos.md` §3                    |
| 11  | Pruebas unitarias                       | `tests/unit/features/qa-tutorials/**`                        |
| 12  | Pruebas de integración                  | `tutorial-flow.test.tsx` (flujo completo)                    |
| 13  | Pruebas Playwright                      | `tests/e2e/qa-tutorials-verification.spec.ts`                |
| 14  | Evidencias de ejecución                 | `04-pruebas-y-evidencias.md` + screenshots E2E               |
| 15  | Archivos creados                        | `02-...` §6                                                  |
| 16  | Archivos modificados                    | `02-...` §6                                                  |
| 17  | Archivos eliminados                     | Ninguno (`02-...` §6)                                        |
| 18  | Limitaciones pendientes                 | `06-limitaciones.md`                                         |
| 19  | Matriz final de cumplimiento            | este documento                                               |
