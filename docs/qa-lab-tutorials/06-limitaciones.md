# Limitaciones y trabajo pendiente (honestidad)

El brief describe una plataforma tipo TestRail/Playwright-studio mucho más amplia
que lo que el portal implementa hoy. Se implementaron tutoriales **reales** para
las herramientas que **sí existen**, y se documenta con transparencia lo que no,
sin inventar recorridos sobre funcionalidad inexistente.

## Funcionalidad del brief que NO existe en el código (fuera de alcance)

| Pedido                                                         | Estado real                                                 | Decisión                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| Planes de prueba jerárquicos                                   | No existe                                                   | Sin tutorial; el motor los admite por datos cuando existan            |
| Casos manuales con pasos manuales / evidencias/capturas/vídeos | No existe (los "casos" son steps de suite contra API)       | Tutorial de suites/steps reales; no se simula gestión manual          |
| Grabador Playwright dentro del portal                          | No existe                                                   | No se crea un tutorial de una herramienta ausente                     |
| Gestión de incidencias/defectos/trazabilidad                   | No existe como módulo                                       | `qa-runs-interpret` enseña a analizar fallos; sin CRUD de incidencias |
| Constructor visual de request API (pestañas headers/auth/body) | Parcial: el lab arma la request; no hay editor tipo Postman | Tutorial sobre el lab real                                            |
| Matriz de navegadores/dispositivos reales                      | No existe                                                   | Fuera de alcance                                                      |
| Comparación visual entre ejecuciones                           | No existe                                                   | Mencionado en tutoriales; sin UI dedicada                             |

## Decisiones de implementación

- **Iconos**: el codebase usa `lucide-react`, no Font Awesome. Se mantuvo la
  consistencia con `lucide-react` (misma semántica de icono + tooltip + aria).
- **Persistencia backend**: AtlasBackend es un repo hermano no editable desde
  aquí. Se implementó un **Route Handler de Next same-origin** (`/api/qa-tutorials/progress`)
  como fuente de verdad portal-owned, con caché de navegador. Está diseñado para
  reapuntarse a AtlasBackend sin cambiar la UI cuando exponga estos endpoints.
  El store usa un fichero JSON en el tmp del sistema (no una tabla): suficiente y
  testeable; migrar a DB es directo.
- **Alcance de cableado de anchors**: se instrumentaron a fondo el Laboratorio y
  la lista de Suites. Detalle de suite, runs y stress tienen tutoriales cuyos
  pasos explican la vista; sus `data-tutorial-id` finos se pueden añadir de forma
  incremental (el motor degrada con gracia si un target no existe).

## Estado de las guardas del proyecto

- `npm run validate` (max-lines, source-boundaries, format:check, type-check,
  lint) pasa en verde en la rama. Se corrigió de paso: `guide-stress-chart.tsx`
  (301→299 líneas) que `max-lines` marcaba, y se reformatearon con Prettier 3
  archivos ya commiteados que `format:check` reportaba (2 de `shared/api` del
  agente de hardening — solo whitespace, anotado en `docs/AGENT-COORDINATION.md`).
- `git status` muestra bajas en `mock-server/**` y cambios en `systems*` previos
  al inicio de esta tarea; no forman parte de este entregable.

## Siguientes pasos recomendados

1. Añadir `data-tutorial-id` finos en detalle de suite/runs/stress para gates de
   clic más precisos.
2. Migrar el store de progreso a AtlasBackend (misma interfaz de cliente).
3. Extender el catálogo cuando existan planes, incidencias y grabador Playwright.
