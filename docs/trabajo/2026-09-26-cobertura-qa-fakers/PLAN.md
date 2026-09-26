# Plan — Cobertura de `qa-lab` en el PR #34 (fakers del mock)

- Fecha: 2026-09-26 · Repos afectados: AtlasAdminPortal · Rama: `feat/qa-fakers` · Predecesor: PR #34
- Resultado observable: el job «Tests unitarios» del PR #34 pasa; hoy falla sólo por el umbral de
  cobertura de `src/features/qa-lab/**` (84,57 % de líneas contra 89 %).
- Kill-test: `yarn test:coverage` sale con código distinto de 0.

## Alcance
- IN: pruebas unitarias nuevas para el código de `qa-lab` que el PR agregó sin cubrir.
- OUT: el código de producción (no se toca), el umbral (no se baja), cualquier otro test.
- Ambigüedades registradas: ninguna.

## H1 — El umbral de cobertura de `qa-lab` se cumple sin bajarlo
**CA:** Dado el PR #34, cuando corre `yarn test:coverage`, entonces `qa-lab` supera el 89 % de líneas.
**DoD:** `yarn test:coverage` → exit 0; `yarn type-check` → exit 0; eslint y prettier limpios en los archivos nuevos.
**Estado:** HECHO

### H1.S1 — Pruebas de lo que el PR dejó sin cubrir
**CA:** cliente, hook, panel de parámetros, campo de semilla y búsqueda de endpoints con pruebas de camino correcto, límite e inválido.
**DoD:** `npx vitest run tests/unit/features/qa-lab` en verde.
**Estado:** HECHO

| ID | Microtarea | CA (binario) | DoD | Estado |
|---|---|---|---|---|
| H1.S1.M1 | `faker-client.test.ts` | red caída, 5xx, 4xx con y sin detalle, unión caso/monto | vitest del archivo en verde | HECHO |
| H1.S1.M2 | `use-fakers.test.tsx` | semilla en blanco, `setParam`/`resetParams`, `fetchCases` reusa caché | vitest del archivo en verde | HECHO |
| H1.S1.M3 | `faker-params-panel.test.tsx` | tipos ajustables, número/texto/fecha/lista, reinicio, errores del mock | vitest del archivo en verde | HECHO |
| H1.S1.M4 | `qa-seed-field.test.tsx` | semilla con nombre, «Personas nuevas», pegar, copiar | vitest del archivo en verde | HECHO |
| H1.S1.M5 | `endpoint-lookup.test.ts` | endpoint real, del mock, inexistente y lote mixto | vitest del archivo en verde | HECHO |
| H1.S1.M6 | Suite completa con umbrales | exit 0 | `yarn test:coverage` → exit 0 | HECHO |

## Riesgos y bloqueos previstos
| Riesgo | Impacto | Mitigación |
|---|---|---|
| Margen chico sobre el umbral (89,48 %) | Otro PR que sume código sin pruebas en `qa-lab` lo vuelve a romper | Se declara en el reporte |
