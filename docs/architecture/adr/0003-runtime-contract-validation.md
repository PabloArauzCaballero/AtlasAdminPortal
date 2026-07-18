# ADR 0003 — Validación de contrato en runtime con Zod (opt-in)

**Estado:** aceptado · **Fase:** 7

## Contexto

Una respuesta 2xx con forma inesperada (un campo que cambió de tipo, un envelope
distinto) se servía tal cual a la UI, que fallaba más adelante de forma difícil
de diagnosticar. Congelar el OpenAPI y generar tipos requiere el spec del
backend, que no estaba disponible; pero la validación en runtime sí se puede
hacer de forma autocontenida.

## Decisión

- `src/shared/api/contract.ts` expone `validateContract(schema, data, ctx)` y el
  error `ApiContractError` (code `API_CONTRACT_ERROR`). Pasando `schema` a
  `apiRequest`, la respuesta 2xx se valida; si no cumple, se lanza el error en
  vez de propagar datos inválidos.
- Es **opt-in**: sin `schema`, el comportamiento no cambia. Así no obliga a
  migrar todos los servicios de golpe.
- El esquema es una **compuerta, no un transformador**: `validateContract`
  devuelve el dato original (no el parseado), para no recortar campos extra que
  el backend añada. Por eso los esquemas de `src/shared/api/schemas.ts` no usan
  `.transform()` ni defaults.
- El error solo lleva **rutas de campos y códigos de Zod** (`issues`), nunca los
  valores: no debe arrastrar PII a logs/observabilidad.

## Consecuencias

- Los fallos de contrato son visibles y correlacionables (endpoint, método,
  requestId) en vez de silenciosos.
- Se integra con observabilidad: un `ApiContractError` se reporta como
  `contract_error` (ver [ADR 0004](0004-observability-redaction.md)).
- Pendiente de la fase: congelar el OpenAPI, generar tipos y un drift-check en CI
  cuando el spec del backend esté disponible.
