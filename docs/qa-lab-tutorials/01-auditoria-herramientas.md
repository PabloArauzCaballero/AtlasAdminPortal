# QA LAB — Auditoría de herramientas (Fase 1)

> Auditoría real del portal (no aspiracional). QA LAB en este portal es el
> **módulo QA** montado bajo `/internal/qa`. No es una plataforma tipo TestRail
> con planes/casos manuales/incidencias/grabador Playwright: es un laboratorio
> para **probar la API real del backend** (prueba funcional, stress y journeys
> encadenados) más la gestión de **suites/pasos/runs** registrados en backend.
>
> Las funcionalidades del brief que **no existen** en el código se marcan como
> `N/A (no existe)` con honestidad; para ellas no se inventan tutoriales
> simulados (ver `06-limitaciones.md`).

## Inventario real (verificado en código, no "existe un botón")

| Módulo      | Ruta                       | Herramienta                 | Acción principal                                                    | Componente                       |
| ----------- | -------------------------- | --------------------------- | ------------------------------------------------------------------- | -------------------------------- |
| Laboratorio | `/internal/qa/lab`         | Prueba unitaria (funcional) | Elegir endpoint → ejecutar request y validar aserciones             | `endpoint-test-card.tsx`         |
| Laboratorio | `/internal/qa/lab`         | Prueba de carga (stress)    | Configurar VUs/duración → correr stress contra un endpoint          | `stress-test-card.tsx`           |
| Laboratorio | `/internal/qa/lab`         | Journey encadenado          | Encadenar varios endpoints simulando un flujo de negocio            | `journey-runner-panel.tsx`       |
| Laboratorio | `/internal/qa/guia`        | Guía estática               | Leer explicación por secciones                                      | `qa-lab-guide-page.tsx`          |
| Suites      | `/internal/qa/suites`      | Suites QA (lista)           | Filtrar + `Nueva suite`                                             | `test-suites-page.tsx`           |
| Suites      | `/internal/qa/suites/[id]` | Detalle de suite            | Tabs Resumen/Pasos/Config/Ejecución, editar, `Nuevo paso`, ejecutar | `test-suite-detail-page.tsx`     |
| Runs        | `/internal/qa/runs`        | Runs QA (lista)             | Ver ejecuciones registradas                                         | `test-runs-page.tsx`             |
| Runs        | `/internal/qa/runs/[id]`   | Detalle de run              | Resumen + steps ejecutados (interpretar estados)                    | `test-run-detail-page.tsx`       |
| Stress      | `/internal/qa/stress`      | Perfiles de stress          | `Nuevo perfil`, matriz de cobertura                                 | `stress-profiles-page.tsx`       |
| Stress      | `/internal/qa/stress/[id]` | Detalle de perfil           | Dry-run + encolar run                                               | `stress-profile-detail-page.tsx` |
| Stress      | `/internal/qa/stress/runs` | Historial de stress runs    | Ver runs de carga                                                   | `stress-runs-page.tsx`           |

## Matriz Módulo × Tutorial (estado inicial → requerido)

| Módulo      | Pestaña / Vista | Herramienta            | Acción principal                         | Tutorial actual            | Problema encontrado                                    | Tutorial requerido                       |
| ----------- | --------------- | ---------------------- | ---------------------------------------- | -------------------------- | ------------------------------------------------------ | ---------------------------------------- |
| Laboratorio | (encabezado)    | Panorama QA LAB        | Entender qué es y cómo se relaciona todo | Solo guía estática `/guia` | No reactivo, no por-acción, no marca progreso          | `qa-lab-overview` (inicial, interactivo) |
| Laboratorio | Prueba unitaria | Funcional              | Elegir endpoint + ejecutar               | Ninguno interactivo        | Sin explicación de campos/estados                      | `qa-lab-functional`                      |
| Laboratorio | Prueba unitaria | Stress                 | Config VUs + correr                      | Ninguno                    | Parámetros opacos (VUs, ramp, umbral p95)              | `qa-lab-stress`                          |
| Laboratorio | Journey         | Journey encadenado     | Encadenar endpoints                      | Ninguno                    | Concepto avanzado sin onboarding                       | `qa-lab-journey`                         |
| Suites      | Lista           | Suites                 | Crear/filtrar suite                      | Ninguno                    | Estado vacío pobre, sin guía de creación               | `qa-suites-list`                         |
| Suites      | Detalle         | Pasos/Config/Ejecución | Añadir pasos + ejecutar                  | Ninguno                    | Tabs sin explicación, estados de ejecución sin leyenda | `qa-suite-detail`                        |
| Runs        | Detalle         | Interpretar resultados | Leer estados de steps                    | Ninguno                    | Estados (pass/fail/blocked) sin significado de negocio | `qa-runs-interpret`                      |
| Stress      | Perfiles        | Perfil de stress       | Crear + dry-run                          | Ninguno                    | Parámetros de carga sin contexto                       | `qa-stress-profile`                      |
| (Módulo)    | —               | Centro de aprendizaje  | Elegir objetivo, ver progreso            | No existía                 | Falta hub de descubrimiento                            | `learning-center` (página)               |

## Funcionalidades del brief que NO existen (honestidad)

Planes de prueba jerárquicos · casos manuales con pasos manuales · grabador
Playwright dentro del portal · gestión de incidencias/defectos/trazabilidad ·
constructor visual de request API con pestañas headers/auth/body · matriz de
navegadores/dispositivos reales · comparación visual de ejecuciones. Estas se
documentan como fuera de alcance del código actual en `06-limitaciones.md`. El
sistema de tutoriales queda **preparado por datos** para incorporarlas sin
tocar el motor cuando esas herramientas existan.
