# Plan — Rediseño evolutivo de ATLAS, empezando por la experiencia móvil

- Fecha: 2026-10-28 · Repos afectados: AtlasAdminPortal (H1, este plan), AtlasERPFrontend (H2), AtlasDashboardsFrontend (H3), AtlasDecisionEngineFrontend (H4). Rama de trabajo en todos: `claude/great-shannon-fm2l7p` · Predecesor: ninguno
- Resultado observable: una persona que abre cualquier portal de ATLAS desde un teléfono (360–430 px) navega con el pulgar (barra inferior), ve una cabecera que cabe sin truncar lo importante, lee tablas y listas sin desplazamiento horizontal, y puede instalar el portal como app en su pantalla de inicio.
- Kill-test: abrir una pantalla interna a 375 px y encontrar (a) más de 4 controles en la cabecera, (b) desplazamiento horizontal de la página, (c) objetivos táctiles de menos de 44 px, o (d) `env(safe-area-inset-*)` valiendo 0 en un iPhone con muesca.

## Qué significa «rediseño» aquí

Decisión del cliente (28/10/2026): mejorar mucho lo que ya está y cambiar una pieza solo cuando hay un motivo legítimo. No se reescribe, no se cambia el sistema de tokens ni el lenguaje visual (verde azulado, neutros, `atlas-*`). Cada cambio estructural lleva su motivo medido en la línea base.

## Alcance

- IN: armazón móvil (cabecera, navegación inferior, cajón), `viewport` y `theme-color`, manifiesto PWA, tablas y listas en móvil, formularios táctiles, microcopy y estados vacíos (con criterios de `copywriting`, `onboarding` y `signup` de marketingskills), capturas por viewport.
- OUT: backend, contratos de API, permisos y rutas, el sistema de tokens, app nativa, service worker con caché offline (es una decisión de producto aparte), commit, push y PR.
- Ambigüedades registradas:
  - «Rediseño de ATLAS» abarca cuatro portales web; no existe app móvil nativa. Supuesto: «mobile» es la web responsive/PWA. Confirmado por la persona en esta sesión.
  - marketingskills no incluye una skill de diseño visual. Supuesto: se usa solo para texto y flujos de acceso/primer uso. Confirmado por la persona en esta sesión.
  - Orden de los portales: AdminPortal primero porque es el de mayor superficie interna y el patrón sale de ahí. A confirmar si otro debe ir antes.

## Línea base medida (AdminPortal, 375×812, sesión y listas simuladas — NO es el backend real)

Evidencia: `evidencia/base/` (capturas `m375_*`).

| #   | Hallazgo                                                                                                              | Motivo legítimo para cambiarlo                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | La cabecera lleva 6 controles (menú, buscar, tutoriales, campana, avatar, salir); título y «Ambiente» se truncan      | No cabe; se pierde el contexto de ambiente, que evita operar contra producción por error |
| 2   | Sin navegación inferior: todo vive tras la hamburguesa arriba a la izquierda                                          | Alcance del pulgar en pantallas altas                                                    |
| 3   | `src/app/layout.tsx` no exporta `viewport`; sin `viewport-fit=cover` los `env(safe-area-inset-*)` ya escritos valen 0 | Defecto: la barra inferior y la muesca no se respetan                                    |
| 4   | Sin `manifest` ni `theme-color`; los iconos 192/512 ya existen en `public/`                                           | No se puede instalar ni colorear la barra del sistema                                    |
| 5   | La línea del explicador de vista corta el título («Inicio — qué es este módulo y esta vista (para…»)                  | Texto útil truncado sin forma de leerlo                                                  |

Pendiente de medir antes de decidir: comportamiento de `DataTable`, `FilterBar` y formularios en 375 px con datos.

## H1 — AdminPortal: móvil que se usa con el pulgar

**CA:** Dado un operador con sesión en un teléfono de 375 px, cuando abre cualquier pantalla interna, entonces la cabecera muestra como mucho 4 controles sin truncar el título, ve una barra inferior con sus accesos principales y «Más», no hay desplazamiento horizontal de la página y todo control mide al menos 44×44 px.
**DoD:** `yarn validate` en verde · `yarn test` en verde · capturas a 375, 768 y 1280 px revisadas con el portal sin errores nuevos de consola · evidencia de que ninguna ruta ni permiso cambió.
**Estado:** A MEDIAS (S1, S2 y gran parte de S3 hechas contra backend simulado; faltan formularios y textos de acceso)

### H1.S1 — Base técnica móvil

**CA:** Dado un iPhone con muesca, cuando se abre el portal, entonces el contenido respeta las áreas seguras y la barra del sistema toma el color del tema.
**DoD:** `yarn type-check` y `yarn lint` en verde; el HTML servido contiene `viewport-fit=cover` y `theme-color`.
**Estado:** HECHO

| ID       | Microtarea                                                      | CA (binario)                                          | DoD (comando de verificación)                                | Estado |
| -------- | --------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ | ------ |
| H1.S1.M1 | Exportar `viewport` (`viewportFit: cover`, `themeColor`)        | El HTML contiene `viewport-fit=cover`                 | `curl … \| grep viewport` → ver `evidencia/salidas.txt`      | HECHO  |
| H1.S1.M2 | `manifest.ts` con nombre, iconos 192/512, `display: standalone` | `/manifest.webmanifest` responde 200 y es JSON válido | `curl -w "%{http_code}"` → 200 (ver `evidencia/salidas.txt`) | HECHO  |

### H1.S2 — Cabecera y navegación inferior

**CA:** Dado `<1024 px`, cuando se navega, entonces la barra inferior lleva Inicio, Buscar, Avisos y «Más» (abre el cajón existente) y la cabecera conserva título/ambiente, avatar y salida.
**DoD:** test unitario de la barra; capturas a 375 px; ningún permiso de `nav-access` se relaja.
**Estado:** HECHO

| ID       | Microtarea                                                                         | CA (binario)                                       | DoD (comando de verificación)                     | Estado |
| -------- | ---------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------- | ------ |
| H1.S2.M1 | `MobileBottomNav` con las 3 rutas sin permiso y «Más» que abre el cajón existente  | No concede ni esconde nada que el menú no hiciera  | `vitest mobile-bottom-nav` → 7 tests en verde     | HECHO  |
| H1.S2.M2 | Montarla en `AppShell` solo `<lg`; subir el botón del asistente; relleno de `main` | El último control no queda tapado                  | captura 375 px (`m375_barra-inferior.png`)        | HECHO  |
| H1.S2.M3 | Cabecera compacta: sin hamburguesa, lupa ni campana en `<md` (la barra las cubre)  | ≤4 controles visibles a 375 px                     | `headerControls: 3` (ver `evidencia/salidas.txt`) | HECHO  |
| H1.S2.M4 | _(añadida)_ Objetivos táctiles: avatar 44 px, miga «Inicio» ≥24 px, barra 56 px    | Avatar y barra ≥44 px; miga ≥24 px (WCAG 2.5.8 AA) | métricas `under44` → solo la miga (36×29)         | HECHO  |

Decisión registrada: «Cerrar sesión» **se queda en la cabecera**. Una prueba existente (`app-sidebar.test.tsx`) y el comentario de `user-menu.tsx` fijan que el usuario y la salida no viven en el cajón; no se debilitó.

### H1.S3 — Tablas, listas y formularios en móvil

**CA:** Dado un listado con datos a 375 px, cuando se lee, entonces cada fila se presenta como tarjeta con sus acciones disponibles y sin desplazamiento horizontal.
**DoD:** capturas con datos sintéticos declarados; `yarn test` en verde.
**Estado:** A MEDIAS (tablas y filtros hechos; formularios sin medir)

| ID       | Microtarea                                                                      | CA (binario)                                                     | DoD (comando de verificación)                         | Estado |
| -------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------- | ------ |
| H1.S3.M1 | `DataTable` apilado `<md` (≤8 columnas, `stack` opt-in/out) con `data-label`    | La acción de la fila es visible a 375 px sin desplazar           | `vitest data-table` → 39 tests; `tableScrollsX:false` | HECHO  |
| H1.S3.M2 | `FilterBar`: «Filtros» plegable `<lg` con contador de activos                   | La primera fila de datos aparece sin desplazar; escritorio igual | `vitest filter-bar` → 21 tests; capturas 375/1280     | HECHO  |
| H1.S3.M3 | Texto del explicador de vista sin truncar a media frase en móvil                | Se lee entero en 375 px                                          | `vitest view-explainer` → 12 tests; captura           | HECHO  |
| H1.S3.M4 | _(añadida)_ Extraer `BotonCopiarTabla` para cumplir `max-lines` 300             | `yarn validate` exit 0                                           | `yarn -s validate; echo $?` → 0                       | HECHO  |
| H1.S3.M5 | Formularios en móvil (campos, teclado virtual, botón de envío visible)          | Medir con un formulario real y decidir                           | —                                                     | TODO   |
| H1.S3.M6 | Tablas de más de 8 columnas (siguen con desplazamiento): pista visual de scroll | Decidir tras medir una con datos                                 | —                                                     | TODO   |

### H1.S4 — Texto y primer uso

**CA:** Dado la pantalla de acceso y un estado vacío, cuando se leen, entonces dicen qué pasó y qué hacer.
**DoD:** diff de textos revisado; capturas.
**Estado:** TODO — la pantalla de acceso se vio en la línea base y es correcta; falta revisar con `copywriting`/`onboarding` los textos de estados vacíos y errores.

## H2 — AtlasERPFrontend · H3 — AtlasDashboardsFrontend · H4 — AtlasDecisionEngineFrontend

Mismo resultado observable y mismos CA, adaptados a su armazón (cada uno ya tiene `viewport-fit=cover` salvo Dashboards, por medir). **Cada hito abre su propio `PLAN.md` en su repo, con línea base medida, antes de escribir código allí.**
**Estado:** TODO

## Riesgos y bloqueos previstos

| Riesgo                                                                | Impacto                                        | Mitigación                                                                                       |
| --------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| No hay backend real: la sesión y los datos se simulan en las capturas | Las capturas prueban layout, no comportamiento | Etiquetar toda evidencia como «backend simulado»; peldaño `VERIFIED_FUNCTIONAL_ONLY` como máximo |
| 4 repos × 3 viewports × 2 temas                                       | Alcance enorme para verificar                  | Franja por franja, un portal cerrado antes del siguiente                                         |
| `jsdom@30` exige Node ≥22.22.2 y aquí hay 22.22.0                     | `yarn install` falla                           | Instalar con `--ignore-engines` solo en este entorno, sin tocar `package.json`                   |
| Límite de 300 líneas por archivo                                      | Componentes nuevos grandes fallan `max-lines`  | Componentes pequeños y separados                                                                 |
