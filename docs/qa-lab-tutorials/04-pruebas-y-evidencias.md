# Pruebas y evidencias (Fase 7)

## Resultado de ejecución (vitest)

```
tests/unit/features/qa-tutorials → 8 archivos, 43 tests → 43 passed
Suites existentes afectadas (qa-lab + qa-console) → 700 passed (sin regresiones)
Guardas de arquitectura: max-lines OK* · source-boundaries OK · eslint OK
type-check (tsc --noEmit) → exit 0 · prettier --check → OK
```

\* `max-lines` sólo reporta `guide-stress-chart.tsx` (301 líneas, preexistente y
ajeno a esta tarea; ver `05-matriz-cumplimiento.md` y `06-limitaciones.md`).

## Pruebas unitarias / integración (frontend + "backend")

| Archivo                           | Qué demuestra                                                                                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tutorial-engine.test.ts`         | Transiciones, fases, porcentajes, progreso, versionado (12 tests)                                                                                                            |
| `catalog.test.ts`                 | Integridad del catálogo, cobertura de herramientas, índice de errores, tooltips (8)                                                                                          |
| `dom-utils.test.ts`               | Posicionamiento del spotlight y recorte al viewport (5)                                                                                                                      |
| `progress-store.test.ts`          | Fusión/aislamiento del store de progreso lado servidor (3)                                                                                                                   |
| `tutorial-flow.test.tsx`          | **Integración end-to-end en jsdom**: arranca, resalta, avanza, **reacciona a una acción real** (element-appears), **persiste completado en backend**, omite sin bloquear (3) |
| `tutorial-launch-button.test.tsx` | Botón visible, estado, aria-label, abre overlay, degradación (4)                                                                                                             |
| `field-help.test.tsx`             | Tooltip/ayuda/ejemplo accesibles y degradación (3)                                                                                                                           |
| `error-help-card.test.tsx`        | Traduce error, abre tutorial en el paso, detalle técnico, código no catalogado (4)                                                                                           |

Cobertura de los requisitos de test del brief:

- Frontend: se muestra el botón ✔ · carga el tutorial correcto ✔ · resalta el
  elemento ✔ (overlay `data-testid`) · detecta clic / aparición de elemento ✔ ·
  conserva el progreso ✔ · se reinicia/omite ✔ · recupera ante elemento
  faltante ✔ (modo `element-missing`) · tooltips accesibles ✔.
- Backend: guarda progreso ✔ · actualiza último paso ✔ · completa ✔ · omite ✔ ·
  recupera progreso ✔ · maneja nueva versión ✔ (`reconcileVersion`).

## Prueba E2E (Playwright)

`tests/e2e/qa-tutorials-verification.spec.ts` — verificación real en navegador:

1. Login autenticado.
2. Carga del **Centro de aprendizaje** (objetivos + recorridos + fichas).
3. Inicia un tutorial desde su ficha → **aparece el overlay** → recorre pasos →
   **finaliza** → cierra.
4. **Persistencia**: recarga y comprueba que la ficha figura «Completado» (viene
   del backend, no de la caché).
5. Botón «Tutorial» del lab abre el recorrido de la pestaña activa y se puede
   cerrar sin bloquear.
6. El «Centro de aprendizaje» aparece en el menú lateral de QA.

Deja screenshots en `test-results/qa-tutoriales-*.png` como evidencia.

### Requisito de entorno E2E

La suite E2E necesita el entorno local levantado (DB :5433 + backend :3005 +
frontend :5273), igual que `qa-guide-verification.spec.ts`. Variables:
`E2E_EMAIL`, `E2E_PASSWORD`, `E2E_TENANT`, `E2E_BASE_URL`. Sin ese entorno, la
verificación automática ejecutable es la de vitest (43/43), que cubre el flujo
completo (arranque → reactividad → persistencia) en jsdom con el backend mockeado.

## Cómo ejecutar

```bash
npm test -- tests/unit/features/qa-tutorials   # unit + integración
npx playwright test tests/e2e/qa-tutorials-verification.spec.ts  # requiere entorno E2E
npm run validate                               # boundaries + lint + type-check + format
```
