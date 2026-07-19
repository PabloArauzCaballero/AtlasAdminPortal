# ADR 0009 — E2E en un workflow separado y no bloqueante

**Estado:** aceptado · **Fase:** 3 / 12

## Contexto

Se añadieron E2E con Playwright (smoke de la página de login + axe). Los E2E con
navegador son más lentos y más frágiles que los tests unitarios (instalación del
navegador, arranque del servidor, timeouts), y se introdujeron sin poder
correrlos en el equipo local.

## Decisión

- Los E2E viven en un workflow **separado** (`.github/workflows/e2e.yml`), no en
  `ci.yml`. Así **no bloquean** los checks requeridos mientras se estabilizan: el
  job instala chromium, buildea la app y corre `playwright test` contra
  `next start`.
- El smoke no depende del backend: valida que el formulario de login carga y que
  axe no reporta violaciones **serias o críticas** (las menores se atacan aparte
  para no volver el gate ruidoso).

## Consecuencias

- `main` sigue siendo mergeable aunque un E2E falle de forma transitoria, pero el
  fallo es visible en su propio workflow.
- El primer run pasó en verde en el runner. **Se puede promover a check
  requerido** (branch protection) cuando se considere estable.
- Para correr E2E en local: `yarn playwright install chromium` (no depende de
  `npx`).
