# ADR 0005 — Los tests viven fuera de `src/`

**Estado:** aceptado · **Fase:** 3

## Contexto

`scripts/check-source-boundaries.mjs` escanea **todo `src/`** y prohíbe `fetch(`,
`localStorage`/`sessionStorage`, `dangerouslySetInnerHTML` y aperturas de ventana
fuera de una allowlist de archivos concretos. Es una guarda de arquitectura
valiosa que solo debe aplicar a código de producción.

## Decisión

Los tests viven en **`tests/`, en la raíz**, no co-localizados en `src/`.

## Consecuencias

- Un test puede mockear `fetch` o `sessionStorage` sin disparar un falso positivo
  en la guarda de límites (que seguiría escaneando `src/` como solo-producción).
- La guarda no se debilita para acomodar tests: sigue siendo estricta.
- El alias `@/` (tsconfig) funciona igual desde `tests/`; `vitest.config.ts`
  replica ese alias y hace `include: tests/unit/**/*.test.{ts,tsx}`.
- Consecuencia menor: los tests referencian el código bajo prueba por alias
  (`@/shared/...`) y los helpers por ruta relativa (`../../helpers/...`).
