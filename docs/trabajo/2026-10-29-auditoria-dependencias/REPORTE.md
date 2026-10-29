> **AVANCE: 2 / 2 microtareas de H1 — 100 %.**

- Fecha: 2026-10-29 · Plan: [PLAN.md](./PLAN.md) · Rama: `claude/fix-auditoria-dependencias`
- Peldaño de evidencia alcanzado: `TESTED`. Las auditorías se reprodujeron localmente con el método del CI (lock generado desde `package.json` + `npm audit`); no se ejercitó el portal en un navegador.

## Completado

| ID    | Qué se logró                                                                                             | Comando                                                          | Resultado                                                             |
| ----- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| H1.M1 | `next` 15.5.27 → 15.5.28 (crítica: RCE en optimización de imágenes con SVG; alta: DoS en Server Actions) | `npm@11 audit --omit=dev --audit-level=high` sobre lock generado | Antes: exit 1, 1 crítica · Después: exit 0, `found 0 vulnerabilities` |
| H1.M2 | `zod` ^4.6.5 → ^4.6.6 (4.6.7) en raíz y broker                                                           | `npm audit --audit-level=high` del broker                        | Antes (CI): 1 alta · Después: exit 0, solo 6 bajas de `deepmerge`     |

Comprobaciones: portal `yarn validate` exit 0 · `yarn test` 351 archivos / 3299 pruebas · `yarn build` exit 0. Broker: `format:check`, `lint`, `typecheck`, `test` (91 pruebas), `build` y `smoke:e2e` (37/37) con exit 0.

## A medias

ninguna

## Pendiente

| ID                                                                       | Estado | Qué lo destraba                                                       |
| ------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------- |
| `deepmerge` (6 bajas, jest/ts-jest, broker) y herramientas de desarrollo | TODO   | Fuera de alcance: no llegan a producción y están por debajo de `high` |
| Construcción de la imagen Docker del broker                              | TODO   | No se ejecutó localmente (no hay Docker aquí); la corre el CI         |

## Evidencia

- `evidencia/audit-raiz-antes.txt`, `evidencia/audit-raiz-despues.txt`.

## No cubierto

- Imagen Docker del broker y E2E de Playwright: los ejecuta el CI.
- El `npm` local (10.9.4) falla al generar el lock de la raíz («edgesOut»); la auditoría de la raíz se hizo con `npm@11`.
- `next` 15.5.28 en un despliegue real.

## Desvíos del plan

ninguno

## Riesgos residuales

- `next` está fijado en versión exacta; la próxima publicación de seguridad exigirá otro cambio manual.
- El CI genera el lock desde `package.json` y no desde `yarn.lock`, así que lo que audita puede diferir de lo que se instala; por eso se subió el mínimo de `zod` en `package.json`, no solo en `yarn.lock`.

## Decisiones y ambigüedades

- No se tocó `.github/workflows/ci.yml`: el control no se relaja.
