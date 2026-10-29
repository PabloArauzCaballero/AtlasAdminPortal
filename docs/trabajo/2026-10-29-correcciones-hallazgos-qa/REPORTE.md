> **AVANCE: 3 / 3 — 100,0 %.**

- Fecha: 2026-10-29 · Plan: [PLAN.md](./PLAN.md) · Rama: `claude/compassionate-franklin-p7u3rw`
- Peldaño de evidencia alcanzado: `TESTED` (suite unitaria completa). Sin `VERIFIED`: no se observó en navegador.

## Completado
| ID | Qué se logró | Comando | Resultado |
|---|---|---|---|
| H1.S1.M1 | OBS-19: `reservedForSystem` en tipo y normalizador (false si el backend no lo manda) | `yarn vitest run tests/unit/features/domain-events` | PASS |
| H1.S1.M2 | OBS-19: «Publicar evento» no ofrece los reservados | prueba `publish-event-dialog.test.tsx` | PASS |
| H2.S1.M1 | OBS-21: miga de pan en una línea; en móvil «Inicio» + último tramo | `tests/unit/app/breadcrumbs-movil.test.tsx` | PASS |

## A medias
ninguna

## Pendiente
ninguno

## Evidencia
```text
yarn type-check -> exit 0 · yarn lint -> 0 errores (19 avisos preexistentes)
yarn test -> Test Files 353 passed · Tests 3302 passed
```

## No cubierto
- Captura a 390 px de la barra superior y de «Publicar evento» con el backend nuevo: no ejecutada.
- OBS-19 depende del commit de AtlasBackend que añade `reservedForSystem`; contra un backend sin él el portal se comporta como antes.

## Desvíos del plan
Ninguno.

## Riesgos residuales
- En móvil se ocultan los tramos intermedios de la miga (solo se ve el último).

## Decisiones y ambigüedades
- Ocultar intermedios en móvil en vez de abreviar: confirmar con diseño si prefieren otro tratamiento.
