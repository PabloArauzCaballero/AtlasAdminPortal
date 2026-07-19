# ADR 0006 — Build estricto y CI en jobs separados

**Estado:** aceptado · **Fase:** 2

## Contexto

`next.config.ts` traía `typescript.ignoreBuildErrors` y
`eslint.ignoreDuringBuilds`: el build pasaba aunque hubiera errores de tipos o
lint. No existía CI. Además, `yarn audit` de Yarn 1 quedó descontinuado (su
endpoint devuelve 410).

## Decisión

- Se **eliminaron** ambos `ignore*`: `next build` vuelve a validar tipos y lint.
  Se verificó que el proyecto ya compilaba limpio, así que las excepciones eran
  deuda innecesaria.
- CI (`.github/workflows/ci.yml`) en **jobs separados**: `quality` (max-lines,
  source-boundaries, format, type-check, lint), `test` (Vitest + cobertura),
  `build` (next build estricto), `secrets` (gitleaks, ver
  [ADR 0007](0007-secretos-gitleaks.md)) y `audit`.
- `audit` usa **`npm audit`** (endpoint vivo) sobre un `package-lock.json`
  generado al vuelo, porque `yarn audit` está muerto.
- Node fijado por `.nvmrc` (22) y usado en todos los jobs.
- E2E va en un workflow aparte (ver [ADR 0009](0009-e2e-workflow-separado.md)).

## Consecuencias

- Un error de tipos/lint rompe el build, no se cuela a producción.
- El CI es la autoridad de verificación (más fiable que el equipo local, que en
  este proyecto ha sido lento/inestable).
- Cobertura con umbrales de **trinquete** (no bajar), no objetivos: se suben en
  el mismo PR que sube cobertura.
