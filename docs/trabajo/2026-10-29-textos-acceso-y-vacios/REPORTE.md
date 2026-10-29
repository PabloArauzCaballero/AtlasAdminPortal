> **AVANCE: 3 / 3 microtareas definidas de H1 (AdminPortal) — 100 %. ERP, Dashboards y DecisionEngine tienen su propia franja de textos pendiente en esta sesión; este reporte solo cubre AdminPortal.**

- Fecha: 2026-10-29 · Plan: [PLAN.md](./PLAN.md) · Rama: `claude/great-shannon-fm2l7p` (AtlasAdminPortal)
- Peldaño de evidencia alcanzado: `TESTED` (`validate` exit 0, 3328 pruebas). Una captura de un estado vacío con y sin filtros contra backend simulado. No se declara `VERIFIED`.

## Completado

| ID    | Qué se logró                                                                                                  | Comando de verificación                   | Resultado                           |
| ----- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------- |
| H1.M1 | El texto vacío por defecto de `DataTable` deja de decir «configuración» (era falso fuera de configuración)    | `vitest data-table` (39 en verde) + suite | PASS · `evidencia/textos.md`        |
| H1.M2 | 8 tablas con texto vacío propio que distingue «sin datos» de «filtros sin resultados» (utilidad `emptyTexts`) | `vitest empty-texts` (3) + captura 375 px | PASS · `evidencia/m375_vacio-*.png` |
| H1.M3 | Errores de red del login y del PIN con salida; pista de «Organización»; ayuda si el código no llega           | `vitest login-copy` (4)                   | PASS · `evidencia/textos.md`        |

`yarn -s validate` exit 0 · `yarn -s test` → `Test Files 356 passed · Tests 3328 passed` (salidas en `evidencia/salidas.txt`).

## A medias

Ninguna.

## Pendiente

| ID  | Estado | Qué lo destraba      |
| --- | ------ | -------------------- |
| —   | —      | Ninguno en este repo |

## Evidencia

- `evidencia/textos.md`: tabla antes → después de cada texto, con el motivo.
- `evidencia/m375_vacio-sin-filtros.png` y `m375_vacio-con-filtros.png`; `evidencia/salidas.txt`.

## No cubierto

- **Backend real**: el estado vacío se vio con una lista simulada vacía; la sesión es sintética.
- **Solo se vio 1 de las 8 tablas** en navegador (`/internal/qa/runs`); las otras 7 usan la misma utilidad, pero no se fotografiaron.
- **Las 117 pantallas con `DataTable`**: las que traen su propio texto vacío (la gran mayoría) no se revisaron una a una; solo las 12 sin texto propio. De ellas 4 son catálogos fijos o nunca se pintan vacías y no se tocaron.
- **Textos de ~90 pantallas con vacíos propios**: se muestrearon, no se auditaron todos.
- **Acceso real**: los mensajes de error de red se probaron con un fallo simulado en jsdom, no con la red caída de verdad.
- **Recuperar acceso** (`recover-access-page.tsx`, 262 líneas): no se revisó su copia.
- **E2E de Playwright**: no se ejecutaron.

## Desvíos del plan

- `stress-profiles-page.tsx` pasó de 281 a 301 líneas con los textos y fallaba `max-lines`; los textos se extrajeron a `stress-empty-texts.ts` (page: 284 líneas).
- Un texto propio sobre auditoría decía «con quién la hizo»; no consta que la tabla muestre el actor y se corrigió antes de cerrar a «con su fecha y su código de referencia».

## Riesgos residuales

- «Pídelo a quien administra tu acceso» es neutro porque no consta a quién se pide; si existe un canal concreto conviene nombrarlo.
- «pulsa “Usar otra cuenta” para volver a empezar» supone que volver al formulario permite pedir otro código; no se comprobó contra el backend real.
- Los textos de «sin coincidencias» mandan a «los filtros de arriba»; en móvil los filtros están plegados tras «Filtros» (rediseño anterior), así que el buscador sí está arriba pero el resto hay que desplegarlo.

## Decisiones y ambigüedades

- Las skills de marketingskills son de captación; solo se aplicaron las reglas transferibles (claridad, especificidad, errores con salida, vacío que orienta). No se añadió urgencia, prueba social ni promesas.
- Se conservó la voz del portal (tú) y no se reescribió el acceso: ya estaba bien y una reescritura no mejoraba nada medible.
- No se añadió un «reenviar código»: sería funcionalidad nueva sin respaldo consultado en el backend.
