# Plan — DDD y código expresivo: Publicación y edición de documentos de consentimiento

- Fecha: 2026-09-22 · Repo: AtlasAdminPortal (frontend web) · Predecesor: ninguno en esta pasada
- Resultado observable de esta pasada: flujo, regla, evidencia y próxima comprobación definidos sin modificar producto.
- Kill-test: si no se puede seguir `src/features/consent-documents/consent-documents-page.tsx` → `src/features/consent-documents/hooks.ts`, el diagnóstico no está completo.

## Alcance

- IN: `src/features/consent-documents/consent-documents-page.tsx`, `src/features/consent-documents/hooks.ts`, `tests/unit/features/consent-documents-page.test.tsx`, contrato y prueba de referencia del flujo.
- OUT: migraciones, cambios de API, UX o reglas no confirmadas; resto del repo.
- Ambigüedad registrada: Documento legal: no inventar política de vigencia ni reemplazo.

## H1 — Diagnóstico y referencia

**CA:** Dado el flujo existente, cuando se inspeccionan entrada, decisión y resultado, entonces la regla tiene un propietario y una prueba de referencia identificables.
**DoD:** inspección de los archivos citados y `npm test -- tests/unit/features/legal-consent-documents.test.ts` con el resultado literal del reporte.
**Estado:** HECHO

### H1.S1 — Rastrear y probar

**CA:** Dado el checkout actual, cuando se sigue el flujo, entonces se distingue regla de coordinación. **DoD:** rutas y símbolos reales registrados abajo. **Estado:** HECHO

| ID       | Microtarea                      | CA (binario)                                 | DoD (comando de verificación)                                                                                                         | Estado |
| -------- | ------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| H1.S1.M1 | Localizar entrada y propietario | Ambas rutas existen y se identificó la regla | `test -f 'src/features/consent-documents/consent-documents-page.tsx' && test -f 'src/features/consent-documents/hooks.ts'` → salida 0 | HECHO  |
| H1.S1.M2 | Fijar referencia                | El chequeo dirigido termina con salida 0     | `npm test -- tests/unit/features/legal-consent-documents.test.ts` → 1 suite; 7/7 pruebas pasan; no cubren la mutación remota          | HECHO  |

**Regla observada:** Publicar y editar son intenciones distintas; la lista se invalida solo tras éxito.

## H2 — Próxima capacidad acotada

**CA:** Dado el contrato confirmado, cuando se ejerce la condición límite del flujo, entonces el resultado visible o persistido coincide con la regla y un rechazo no produce efecto parcial.
**DoD:** prueba de comportamiento dirigida, verificación de contrato y recorrido real si se modifica código; reporte con salida literal.
**Estado:** HECHO

### H2.S1 — Confirmar semántica antes de refactorizar

**CA:** La condición límite tiene resultado esperado documentado. **DoD:** prueba dirigida y revisión del contrato vigente. **Estado:** HECHO

| ID       | Microtarea                        | CA (binario)                                                      | DoD (comando de verificación)                                                | Estado |
| -------- | --------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------ |
| H2.S1.M1 | Probar rechazo al editar el texto | El editor conserva el borrador y la versión publicada no cambia   | `npm test -- tests/unit/features/consent-documents-page.test.tsx` → salida 0 | HECHO  |
| H2.S1.M2 | Probar edición confirmada         | El editor se cierra y la lista se refresca tras respuesta exitosa | mismo comando → salida 0                                                     | HECHO  |

## Riesgos y bloqueos previstos

| Riesgo                                                          | Impacto                    | Mitigación                                                       |
| --------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------- |
| Documento legal: no inventar política de vigencia ni reemplazo. | Resultado o contrato falso | Confirmar con código, contrato y prueba antes de editar producto |

## Decisión de diseño

El propietario observado es `src/features/consent-documents/hooks.ts`. No se introduce una capa DDD nueva por nombre. Una refactorización futura necesitará mostrar una llamada más clara y la misma semántica en la entrada real, con prueba roja antes de cambiar implementación. Si la comprobación H2 demuestra que el diseño actual ya protege la regla, se registra como DESCARTADO el cambio de código.

**Ruling 2026-09-22:** la pantalla inspeccionada edita texto; `publishConsentDocument` existe en el gateway, pero esta pantalla no lo llama. Se ejecuta H2 sobre edición. Probar publicación aquí habría verificado un flujo inexistente.
