# QA LAB Tutoriales — Entregables e implementación (Fase 2–6)

Sistema de tutoriales interactivos **data-driven, reactivo y persistido en
backend** para QA LAB. El motor no conoce ningún recorrido concreto: lee un
catálogo de datos, resalta elementos por `data-tutorial-id` y avanza según las
acciones reales del usuario.

## 1. Arquitectura

```
src/features/qa-tutorials/
├── types.ts                     Modelo (TutorialDefinition/Step/Progress)
├── tutorial-engine.ts           Máquina de estados PURA (sin DOM) + progreso
├── use-tutorial-runtime.ts      Efectos reactivos: navegación + gate por acción
├── dom-utils.ts                 Geometría pura del spotlight (posicionamiento)
├── spotlight-overlay.tsx        Portal: highlight + tracking de rect (rAF)
├── tutorial-card.tsx            Tarjeta presentacional + teclado + a11y
├── tutorial-provider.tsx        Context: orquesta motor + persistencia + overlay
├── status-visuals.ts            Estado → etiqueta/icono/color
├── tutorial-launch-button.tsx   Botón visible por sección (con estado)
├── tutorial-objective-launcher  «¿Qué quieres hacer?» (por objetivo)
├── tutorial-list-card.tsx       Ficha de tutorial en el centro de aprendizaje
├── learning-center-page.tsx     Centro de aprendizaje (búsqueda, paths, filtro)
├── learning-paths.ts            Recorridos sugeridos
├── field-help.tsx / -catalog    Ayuda de campo (tooltip + guía + ejemplo)
├── error-help-card.tsx / error-catalog  Ayuda contextual de errores
├── catalog/                     Recorridos por módulo (lab, console, stress)
├── progress-schema.ts           Esquema zod compartido cliente/servidor
├── progress-remote.ts           Cliente del endpoint (same-origin)
├── progress-storage.ts          Caché de navegador (no fuente de verdad)
├── use-tutorial-progress.ts     Hook TanStack Query (backend + caché)
└── server/progress-store.ts     Store lado servidor (fichero JSON)
```

**Separación de responsabilidades**: la lógica que decide algo (transiciones,
porcentajes, fusión de progreso, geometría) es **pura y testeada en aislamiento**;
los efectos (DOM, red, rAF) viven en hooks/componentes finos.

**Demos interactivas en la tarjeta**: un paso puede declarar `demo` para
incrustar una visualización viva. `qa-lab-stress` usa `demo: "latency"` →
`latency-demo-chart.tsx` anima la curva de latencia p95 **a medida que se
procesan las peticiones**, como ejemplo de cómo se lee una prueba de carga.
Los pasos también llevan `example` (bloque de ejemplo práctico) donde aporta.

## 2. Reactividad (reacciona a acciones reales)

`use-tutorial-runtime.ts` implementa los gates:

| requiredAction    | Cómo detecta la acción real                                     |
| ----------------- | --------------------------------------------------------------- |
| `click`           | Listener en captura; `event.target.closest([data-tutorial-id])` |
| `input-filled`    | Listener `input`; avanza cuando el target tiene valor           |
| `element-appears` | `MutationObserver` sobre `document.body` (async/modal/fila)     |
| `route-change`    | Compara `usePathname()` con la ruta esperada                    |
| `none`            | Avanza con el botón «Siguiente»                                 |

El overlay (`spotlight-overlay.tsx`) hace **tracking del rectángulo cada frame**
(`requestAnimationFrame`) → recalcula posición ante scroll/resize/layout async,
hace `scrollIntoView`, y si el elemento no aparece entra en **modo recuperación**
(`element-missing`) sin bloquear: el usuario siempre puede continuar o cerrar.

Cambio automático de pestaña/página: `step.nextRoute` navega al entrar al paso.

## 3. Identificadores estables (`data-tutorial-id`) añadidos

| data-tutorial-id           | Dónde                     | Archivo                         |
| -------------------------- | ------------------------- | ------------------------------- |
| `qa-lab-tabs`              | Pestañas del lab          | qa-lab-page.tsx                 |
| `qa-lab-endpoint-picker`   | Selector de endpoint      | qa-lab-page.tsx                 |
| `qa-lab-endpoint-search`   | Buscador del selector     | endpoint-picker.tsx             |
| `qa-lab-functional-card`   | Tarjeta funcional         | qa-lab-page.tsx                 |
| `qa-lab-run-functional`    | Botón ejecutar            | endpoint-test-card.tsx          |
| `qa-lab-functional-result` | Resultado de la ejecución | endpoint-test-card.tsx          |
| `qa-lab-stress-card`       | Tarjeta de carga          | qa-lab-page.tsx                 |
| `qa-lab-journey-panel`     | Editor de journey         | qa-lab-page.tsx                 |
| `qa-lab-guide-link`        | Enlace a la guía          | qa-lab-page.tsx                 |
| `qa-suites-new`            | Botón «Nueva suite»       | test-suites-page.tsx            |
| `qa-suites-table`          | Tabla de suites           | test-suites-page.tsx            |
| `qa-suite-form`            | Formulario de suite       | test-suites-page.tsx            |
| `qa-suite-tabs`            | Pestañas del detalle      | test-suite-detail-page.tsx      |
| `qa-suite-execution`       | Panel de ejecución        | suite-execution-panel.tsx       |
| `qa-suite-run-button`      | Botón ejecutar suite      | suite-execution-panel.tsx       |
| `qa-run-summary`           | Resumen del run           | test-run-detail-page.tsx        |
| `qa-run-steps`             | Steps ejecutados          | test-run-detail-page.tsx        |
| `qa-stress-new`            | Botón «Nuevo perfil»      | stress-profiles-page.tsx        |
| `launch-<id>`              | Cada botón de tutorial    | tutorial-launch-button.tsx      |
| `field-<key>`              | Cada etiqueta con ayuda   | field-help.tsx                  |
| `error-help-<code>`        | Cada tarjeta de error     | error-help-card.tsx             |
| `objective-launcher`       | Launcher por objetivo     | tutorial-objective-launcher.tsx |

> Nunca se usan selectores CSS frágiles: todo apunta a `data-tutorial-id`.

## 4. Endpoints creados

| Método | Ruta                                 | Función                                |
| ------ | ------------------------------------ | -------------------------------------- |
| GET    | `/api/qa-tutorials/progress?userId=` | Lista el progreso del usuario          |
| PUT    | `/api/qa-tutorials/progress`         | Upsert de un progreso (valida con zod) |

Route Handler de Next (portal-owned), fuente de verdad del progreso. El store
persiste en un fichero JSON del tmp del sistema, keyeado por usuario. Diseñado
para reapuntarse a AtlasBackend sin tocar la UI cuando exponga estos endpoints.

## 5. Componentes reutilizables entregados

`TutorialProvider` · `TutorialLaunchButton` (full/compact) · `TutorialObjectiveLauncher`
· `TutorialListCard` · `SpotlightOverlay` · `TutorialCard` · `FieldHelpLabel` /
`InfoDot` · `ErrorHelpCard` · hooks `useTutorial()` y `useTutorialProgress()`.

## 6. Archivos

### Creados (código)

- Feature `src/features/qa-tutorials/**` (30 archivos: motor, componentes, catálogos, persistencia).
- `src/app/api/qa-tutorials/progress/route.ts` (endpoint de progreso).
- `src/app/internal/qa/layout.tsx` (monta el provider en /internal/qa).
- `src/app/internal/qa/aprender/page.tsx` (ruta del centro de aprendizaje).

### Creados (tests)

- `tests/unit/features/qa-tutorials/**` (8 archivos, 43 tests).
- `tests/e2e/qa-tutorials-verification.spec.ts` (Playwright).

### Creados (docs)

- `docs/qa-lab-tutorials/**` (esta carpeta).

### Modificados

- `src/features/qa-lab/qa-lab-page.tsx` — launch button, enlace al centro, anchors.
- `src/features/qa-lab/endpoint-test-card.tsx` — anchors de run/resultado.
- `src/features/qa-console/test-suites-page.tsx` — launch button, empty state autodescriptivo, anchors.
- `src/features/qa-console/test-suite-detail-page.tsx` — launch button + anchor de pestañas.
- `src/features/qa-console/test-runs-page.tsx` — launch button.
- `src/features/qa-console/test-run-detail-page.tsx` — launch button + anchors de resumen/steps.
- `src/features/qa-console/suite-execution-panel.tsx` — **`ErrorHelpCard`** ante fallo real (clasifica el status HTTP) + anchors.
- `src/features/qa-stress/stress-profiles-page.tsx` — launch button + anchor `qa-stress-new`.
- `src/features/qa-tutorials/error-catalog.ts` — `classifyHttpStatus` (status → código con ayuda).
- `src/shared/components/layout/internal-shell/nav-groups-primary.ts` — ítem «Centro de aprendizaje».
- `scripts/check-source-boundaries.mjs` — allowlist de `progress-remote.ts` (fetch same-origin) y `progress-storage.ts` (caché).

Con esto, **las 8 herramientas de QA tienen botón de tutorial visible** (lab,
suites lista/detalle, runs lista/detalle, stress) y la **ayuda contextual de
errores está consumida en una superficie real** (ejecución de suite), no sólo
disponible como componente.

### Eliminados

- Ninguno. (Las bajas de `mock-server/**` visibles en `git status` son ajenas a esta tarea.)
