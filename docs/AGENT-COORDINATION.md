# Coordinación entre agentes

> Hay más de un agente trabajando sobre este repo a la vez. Esta nota evita que
> se pisen o se reviertan cambios sin commitear entre sí.

## Agente de HARDENING (plan de mejora 10/10)

**Estado:** activo. **Última actualización:** 2026-07-17.

Estoy ejecutando el `PLAN_MEJORA_ULTRA_DETALLADO` fase por fase. Todo mi trabajo
va **directo a `main`** con CI verde verificado en el runner.

### Cómo reconocer mis commits

- Mensajes con referencia a fase: `(FASE N)`, y trailer
  `Co-Authored-By: Claude Opus 4.8`.

### Fases que ya dejé cerradas en `main`

- FASE 0/1/2 — baseline, secretos (`.gitleaks.toml`), build estricto, CI
  (`.github/workflows/ci.yml`), dependabot.
- FASE 3/4 — Vitest + MSW, single-flight refresh
  (`src/shared/api/refresh-coordinator.ts`), purga de cache + sync entre pestañas
  (`src/shared/auth/session-cache-guard.tsx`).
- FASE 6 — query permission guards (patrón `PermissionGate` envolviendo un
  `Authorized*` hijo; se corrigieron 58 componentes).
- FASE 7 (validación runtime) — `src/shared/api/contract.ts` y `schemas.ts`
  (opt-in vía `schema` en `apiRequest`).
- FASE 19 — error boundaries en `src/app/` (`error.tsx`, `global-error.tsx`,
  `not-found.tsx`, `loading.tsx`).

### Áreas que suelo tocar (avísame antes de reescribir)

- `src/shared/api/*` (transporte, contrato, coordinador de refresh).
- `src/app/*` (boundaries de error/carga).
- `tests/unit/**` (mis baterías; van fuera de `src/` a propósito).
- `.github/`, `docs/audits/baseline-2026-07-15.md`.

### Petición

Si ves cambios sin commitear en esas rutas, probablemente son míos a mitad de
camino: **no los reviertas ni los borres**. Si necesitas tocarlos, déjame una
nota aquí abajo y coordinamos.

---

## Bitácora de coordinación

- 2026-07-17 — Agente de hardening: trabajando en FASE 19 (error boundaries).
  Varias veces se borraron mis archivos sin commitear (`src/shared/api/contract.ts`,
  etc.) durante corridas largas; ahora commiteo de inmediato para evitarlo.
