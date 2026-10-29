# Plan — Auditoría de dependencias (AdminPortal y broker de identidad)

- Fecha: 2026-10-29 · Repos afectados: AtlasAdminPortal · Predecesor: PR #169 (bloqueado por `release-gate`)
- Resultado observable: los jobs «Auditoría de dependencias (high+)» y «Broker de identidad (calidad, seguridad, imagen)» pasan en CI.
- Kill-test: `npm audit --omit=dev --audit-level=high` sobre un lock generado desde `package.json` sale con 1 crítica (`next`); el del broker con 1 alta (`zod`).

## Diagnóstico

| Job              | Aviso                                                                                               | Causa                                              | Arreglo             |
| ---------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------- |
| Auditoría (raíz) | `next` 15.5.27: crítica (RCE en la API de optimización de imágenes con SVG) y DoS en Server Actions | `next` fijado exacto en 15.5.27; parche en 15.5.28 | `"next": "15.5.28"` |
| Broker           | `zod` <4.6.6 (alta, agotamiento de memoria)                                                         | `^4.6.5`                                           | `^4.6.6`            |

El broker también lista `deepmerge` (6 bajas, vía jest/ts-jest): solo desarrollo y por debajo de `high`; no bloquea y no se toca.

## Alcance

- IN: `next` (raíz), `zod` (raíz y broker) y sus lockfiles.
- OUT: `eslint-config-next` (desarrollo), `deepmerge`/jest, cualquier otra subida, `.github/workflows/ci.yml` (el control no se relaja).

## H1 — Auditorías en verde

**CA:** Dado el árbol de producción del portal y las dependencias del broker, cuando corre su `npm audit` del CI, entonces no hay avisos high ni critical.
**DoD:** auditorías con exit 0 · `yarn validate`, `yarn test`, `yarn build` exit 0 · calidad del broker (format, lint, typecheck, test, build) exit 0.
**Estado:** TODO

| ID    | Microtarea                    | CA (binario)               | DoD                                    | Estado |
| ----- | ----------------------------- | -------------------------- | -------------------------------------- | ------ |
| H1.M1 | `next` 15.5.28 en la raíz     | `npm audit --omit=dev` = 0 | auditoría + `yarn validate/test/build` | TODO   |
| H1.M2 | `zod` ^4.6.6 en raíz y broker | `npm audit` sin altas      | auditoría + comprobaciones del broker  | TODO   |
