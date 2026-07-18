# ADR 0004 — Observabilidad con redacción de tokens/PII

**Estado:** aceptado · **Fase:** 18

## Contexto

No había forma de diagnosticar fallos en producción. Pero enviar telemetría a un
sink externo es peligroso: es fácil filtrar un `Authorization`, un token o un
email si se manda el contexto crudo.

## Decisión

- `src/shared/observability/reporter.ts` expone `reportEvent(type, error,
context)`, que arma un evento con contexto base (environment, release, route) +
  `status`/`code`/`requestId` si el error es `AtlasApiError`, **todo redactado**,
  y lo entrega a un sink configurable (`setObservabilitySink`).
- `src/shared/observability/redact.ts` redacta recursivamente por nombre de clave
  (authorization, cookie, tokens, csrf, email, teléfono, documento…) y enmascara
  `Bearer xxx` en texto libre.
- Es **best-effort**: `reportEvent` nunca lanza, ni siquiera si el sink falla. La
  telemetría no debe tumbar la app.
- El sink por defecto es no-op. `console-sink.ts` se registra solo con
  `NODE_ENV=development`; en producción se registra un sink real (Sentry/endpoint).
- Eventos ya cableados: `contract_error` (ver
  [ADR 0003](0003-runtime-contract-validation.md)), `refresh_fail`, `route_error`
  (desde el error boundary de la app).

## Consecuencias

- Los errores son rastreables (release, ruta, requestId) sin arrastrar secretos.
- Un test verifica que ni un `accessToken` ni un email aparecen en el evento
  serializado.
- Pendiente: registrar el sink real de producción y añadir web-vitals.
