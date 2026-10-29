# Plan — correcciones de hallazgos del QA (Admin Portal)

- Fecha: 2026-10-29 · Repos afectados: AtlasAdminPortal (depende de AtlasBackend `reservedForSystem`) · Predecesor: AtlasDocumentationHub/10-testing/qa-flujo-completo-2026-10-28
- Resultado observable: «Publicar evento» no ofrece eventos reservados al sistema (OBS-19); en 390 px la miga de pan no se recorta (OBS-21).
- Kill-test: el desplegable de «Publicar evento» contiene `bank_statement.in_review`.

## Alcance

- IN: `features/domain-events/{types,services,publish-event-dialog}`, `shared/components/layout/internal-shell/breadcrumbs.tsx`.
- OUT: resto del portal.
- Ambigüedades: contra un backend sin el campo nuevo, `reservedForSystem` es false y se ofrece todo como hasta ahora (compatibilidad hacia atrás).

## H1 — OBS-19

**CA:** Dado el catálogo con `reservedForSystem: true`, cuando se abre «Publicar evento», entonces ese evento no está entre las opciones.
**DoD:** `yarn vitest run tests/unit/features/domain-events` + `yarn type-check`.
**Estado:** A MEDIAS

| ID       | Microtarea                                       | CA (binario)                          | DoD                                                 | Estado |
| -------- | ------------------------------------------------ | ------------------------------------- | --------------------------------------------------- | ------ |
| H1.S1.M1 | Campo `reservedForSystem` en tipo y normalizador | true solo si el backend lo manda true | `yarn vitest run tests/unit/features/domain-events` | HECHO  |
| H1.S1.M2 | El diálogo filtra los reservados                 | no aparece en `options`               | prueba del diálogo                                  | HECHO  |

## H2 — OBS-21

**CA:** Dado un ancho de 390 px, cuando la ruta tiene varios segmentos, entonces la miga queda en una línea con el último segmento visible.
**DoD:** prueba de clases + `yarn type-check`; captura a 390 px (no ejecutada si el stack no está disponible).
**Estado:** A MEDIAS

| ID       | Microtarea                                                           | CA (binario)                                  | DoD                              | Estado |
| -------- | -------------------------------------------------------------------- | --------------------------------------------- | -------------------------------- | ------ |
| H2.S1.M1 | Miga sin salto de línea; en móvil solo «Inicio» y el último segmento | sin `flex-wrap`; intermedios `hidden sm:flex` | `yarn vitest run tests/unit/app` | HECHO  |
