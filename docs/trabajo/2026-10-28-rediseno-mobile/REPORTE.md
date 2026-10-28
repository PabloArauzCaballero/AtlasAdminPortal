> **AVANCE: 10 / 12 microtareas definidas de H1 (AdminPortal) — 83,3 %. H2, H3 y H4 (ERP, Dashboards, DecisionEngine) todavía no están descompuestas en microtareas: el rediseño completo NO está terminado.**

- Fecha: 2026-10-28 · Plan: [PLAN.md](./PLAN.md) · Rama: `claude/great-shannon-fm2l7p` (AtlasAdminPortal)
- Peldaño de evidencia alcanzado: `TESTED` en H1.S1–S3 (pruebas dirigidas y suite completa en verde). El aspecto se comprobó con capturas a 375/768/1280 px **contra un backend simulado** (sesión y listas inventadas con rutas de Playwright), así que el comportamiento de cara al usuario real queda en `VERIFIED_FUNCTIONAL_ONLY` como máximo y **no** se declara `VERIFIED`.

## Completado

| ID       | Qué se logró                                                                             | Comando de verificación               | Resultado                                        |
| -------- | ---------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------ |
| H1.S1.M1 | `viewport-fit=cover`, `theme-color` y zoom habilitado servidos en el HTML                | `curl … \| grep viewport`             | PASS · `evidencia/salidas.txt`                   |
| H1.S1.M2 | Manifiesto PWA (`/manifest.webmanifest`, standalone, iconos 192/512)                     | `curl -w "%{http_code}"`              | PASS (HTTP 200) · `evidencia/salidas.txt`        |
| H1.S2.M1 | `MobileBottomNav` (Inicio, Buscar, Avisos con contador, Más que abre el cajón existente) | `vitest mobile-bottom-nav`            | PASS · 7 tests                                   |
| H1.S2.M2 | Barra montada solo `<lg`; botón del asistente y relleno de `main` ajustados              | captura 375 px                        | PASS · `despues/m375_barra-inferior.png`         |
| H1.S2.M3 | Cabecera de 3 controles a 375 px (antes 6) con título y ambiente enteros                 | métrica `headerControls`              | PASS · `evidencia/salidas.txt`                   |
| H1.S2.M4 | Avatar 44 px, barra 56 px, miga «Inicio» ≥24 px                                          | métrica `under44`                     | PASS parcial · ver «A medias → miga»             |
| H1.S3.M1 | `DataTable` apilado en `<md` (≤8 columnas): la acción de la fila ya es visible           | `vitest data-table` + `tableScrollsX` | PASS · 39 tests · `despues/m375_notificaciones…` |
| H1.S3.M2 | `FilterBar` con «Filtros» plegable `<lg` y contador de activos                           | `vitest filter-bar` + capturas        | PASS · 21 tests                                  |
| H1.S3.M3 | Explicador de vista sin truncar a media frase en móvil                                   | `vitest view-explainer`               | PASS · 12 tests                                  |
| H1.S3.M4 | `BotonCopiarTabla` extraído para cumplir `max-lines` 300                                 | `yarn -s validate; echo $?`           | PASS · exit 0                                    |

Suite completa tras la última extracción: `Test Files 354 passed · Tests 3321 passed` (`yarn -s test`). `yarn -s validate` → exit 0, 0 errores y 19 avisos (los mismos 19 de antes, todos `.skip()` de specs E2E ya existentes).

## A medias

### H1.S2.M4 — miga «Inicio» a 36×29 px

- Qué anda: cumple WCAG 2.5.8 AA (24 px). Avatar y barra cumplen 44 px.
- Qué no anda: la miga no llega a 44 px (el criterio AAA / la regla del repo de 44 px en puntero grueso).
- Qué falta exactamente: decidir si las migas de pan deben ser objetivo de 44 px; hacerlo desplaza la cabecera, que tiene altura fija `h-16`.
- Dónde quedó: `internal-shell/breadcrumbs.tsx`, compila, tests en verde.

## Pendiente

| ID       | Estado | Qué lo destraba                                                                                                           |
| -------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| H1.S3.M5 | TODO   | Medir un formulario real a 375 px (hace falta una pantalla con formulario y su simulación)                                |
| H1.S3.M6 | TODO   | Medir una tabla de >8 columnas con datos y decidir la pista de desplazamiento                                             |
| H1.S4    | TODO   | Revisar con `copywriting`/`onboarding`/`signup` los estados vacíos y de error                                             |
| H2       | TODO   | Abrir `PLAN.md` en AtlasERPFrontend con su línea base medida (ya trae `viewport-fit`)                                     |
| H3       | TODO   | Ídem en AtlasDashboardsFrontend                                                                                           |
| H4       | TODO   | Ídem en AtlasDecisionEngineFrontend (ya tiene un sistema responsive amplio: partir de sus 22 `@media (max-width: 560px)`) |

## Evidencia

- `evidencia/base/` (antes) y `evidencia/despues/` (después): capturas a 375, 768 y 1280 px.
- `evidencia/salidas.txt`: comandos y salidas literales (recortadas).
- Datos de las capturas: **sintéticos y declarados** (`Persona QA Sintética`, `@example.test`, mensajes «Mensaje sintético de prueba…»). No hay datos reales de clientes.

## No cubierto

- **Backend real**: nunca se ejercitó. Sesión y listas son un doble de Playwright; la forma del sobre `{data: …}` se tomó de `src/shared/api/response.ts`. Lo verificado es layout, no comportamiento de extremo a extremo.
- **Dispositivos reales**: solo emulación de Chromium (`isMobile`, `hasTouch`). No se probó en iOS Safari, donde `env(safe-area-inset-*)`, la barra de direcciones y `display: block` sobre tablas se comportan distinto.
- **Tema oscuro**: el portal no lo tiene; no aplica.
- **E2E de Playwright y axe**: no se ejecutaron (requieren credenciales y backend). Los roles ARIA explícitos del modo apilado están probados en unitarias, no con axe.
- **Pantallas con >8 columnas**, formularios, modales y el cajón con grupos abiertos: no se midieron.
- **Las 117 pantallas que usan `DataTable` y las 86 con `FilterBar`**: solo se vio una con datos (`/internal/my-notifications`). El resto hereda el cambio por el componente pero no se fotografió.
- **Rutas «Inicio» y «Audit»** salieron como «Acceso restringido» y error en mi simulación por permisos y forma de datos inventados; es límite del arnés, no un hallazgo.

## Desvíos del plan

- Se añadieron H1.S2.M4 (objetivos táctiles), H1.S3.M3 (texto del explicador) y H1.S3.M4 (extraer el botón de copiar) al descubrirlos al medir; están registrados en el plan.
- Se **descartó** mover «Cerrar sesión» al cajón (estaba en el plan inicial como idea): una prueba existente y un comentario del repo fijan lo contrario. No se debilitó esa prueba.
- Las cabeceras y la hamburguesa no se rediseñaron en escritorio: queda idéntico.

## Riesgos residuales

- `DataTable` apila por defecto con ≤8 columnas. Una pantalla cuya tabla sea realmente comparativa por columnas (cifras) pierde esa lectura en móvil; el remedio es `stack={false}` y habría que revisarlas una a una.
- `FilterBar` plega los filtros por debajo de 1024 px: una persona en tablet vertical tiene un clic más para filtrar. Si alguna pantalla necesita sus filtros siempre visibles, hoy no hay opción para pedirlo.
- Los E2E existentes que hagan clic en un filtro a viewport < 1024 px fallarían por estar plegado. No se ejecutaron (ver «No cubierto»).
- El jsdom de las pruebas no aplica CSS: «plegado» y «apilado» se prueban por clases, y la apariencia real solo se vio en capturas.

## Decisiones y ambigüedades

- «Mobile» = web responsive/PWA (no app nativa). Confirmado por la persona en la sesión.
- marketingskills se usa solo para texto y flujos; **no se ha aplicado todavía** (H1.S4 pendiente). A confirmar con la persona si quiere esa revisión antes o después de rediseñar los otros portales.
- La PWA no registra service worker ni cachea datos: decisión deliberada (un portal operativo que muestra datos viejos sin avisar es peor que uno que dice «sin conexión»). A confirmar con producto si se quiere offline.
- Umbral de apilado en 8 columnas: criterio mío, no medido con datos reales. A confirmar tras revisar tablas anchas (H1.S3.M6).
- Entorno: `yarn install` necesitó `--ignore-engines` (jsdom 30 exige Node ≥22.22.2 y aquí hay 22.22.0). No se tocó `package.json`.
