> **AVANCE: 5 / 5 — 100,0 %.**

- Fecha: 2026-10-29 · Plan: [PLAN.md](./PLAN.md) · Rama: `claude/compassionate-franklin-p7u3rw`
- Peldaño de evidencia alcanzado: `TESTED` (suite unitaria completa). Sin `VERIFIED`: no se observó en navegador.

## Completado

| ID       | Qué se logró                                                                                           | Comando                                                                 | Resultado                                                                                                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1.S1.M1 | OBS-19: `reservedForSystem` en tipo y normalizador (false si el backend no lo manda)                   | `yarn vitest run tests/unit/features/domain-events`                     | PASS                                                                                                                                                                                                                                                            |
| H1.S1.M2 | OBS-19: «Publicar evento» no ofrece los reservados                                                     | prueba `publish-event-dialog.test.tsx`                                  | PASS                                                                                                                                                                                                                                                            |
| H2.S1.M1 | OBS-21: miga de pan en una línea; en móvil «Inicio» + último tramo                                     | `tests/unit/app/breadcrumbs-movil.test.tsx`                             | PASS                                                                                                                                                                                                                                                            |
| H3.S1.M1 | OBS-30: `avisoDeDestino` avisa cuando la operación es de otro servicio y la ruta base es la del portal | `yarn vitest run tests/unit/features/qa-lab/destination-notice.test.ts` | PASS (5: correcto, límite ×2, inválido ×2) · suite qa-lab 47 archivos / 825 pruebas · type-check, lint (0 errores), format:check, max-lines OK                                                                                                                  |
| H3.S1.M2 | OBS-30 en Chromium: operación #1078 (ERP) muestra el aviso; la #1 (AtlasBackend) no                    | script `obs30.cjs`                                                      | PASS: `1078 aviso visible: 1` / `#1 aviso visible: 0` · captura `AtlasDocumentationHub/…/25-pasada-h4/admin_qa_lab_aviso_destino.png`. No cubierto: no se cambia el destino de envío ni la lista de hosts permitidos; el 404 sigue ocurriendo si se envía igual |

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
