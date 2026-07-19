# ADR 0008 — Llaves de idempotencia para mutaciones

**Estado:** aceptado · **Fase:** 8

## Contexto

Una mutación podía ejecutarse dos veces por un doble clic o por un reintento de
red, sin forma de que el backend supiera que era la misma operación.

## Decisión

- `apiRequest` acepta `idempotencyKey` (opt-in). Si viene, se envía como header
  **`Idempotency-Key`** — **solo en mutaciones** (en un GET se ignora, no tiene
  sentido).
- `src/shared/api/idempotency.ts` expone `newIdempotencyKey()`
  (`crypto.randomUUID` con fallback criptográfico + contador, sin `Math.random`).
- **Regla de uso:** la llave se genera **una vez por acción del usuario** y se
  reenvía en cada reintento de esa acción. No se regenera por reintento: eso
  anularía la deduplicación. Como el retry del single-flight
  ([ADR 0001](0001-single-flight-refresh.md)) hace spread de las opciones, la
  llave se conserva automáticamente.

## Consecuencias

- El backend puede deduplicar mutaciones repetidas por la misma llave.
- Es una de las capas contra doble ejecución; se combina con las de UI
  (`isPending`, botón deshabilitado) y con la deduplicación del backend, que es
  la autoridad final.
- Pendiente: adoptar la llave en las mutaciones críticas concretas (stress runs,
  exports, decisiones de casos, etc.); el mecanismo ya está listo.
