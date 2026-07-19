# Architecture Decision Records (ADR)

Registro de decisiones de arquitectura tomadas durante el hardening del portal
(plan de mejora 10/10). Cada ADR explica el contexto, la decisión y sus
consecuencias, para que otro equipo (u otro agente) entienda el _por qué_ sin
tener que reconstruirlo desde el código.

| #                                           | Decisión                                                 | Fase |
| ------------------------------------------- | -------------------------------------------------------- | ---- |
| [0001](0001-single-flight-refresh.md)       | Refresh de sesión coordinado (single-flight)             | 4    |
| [0002](0002-query-permission-guards.md)     | El PermissionGate envuelve a un componente `Authorized*` | 6    |
| [0003](0003-runtime-contract-validation.md) | Validación de contrato en runtime con Zod (opt-in)       | 7    |
| [0004](0004-observability-redaction.md)     | Observabilidad con redacción de tokens/PII               | 18   |
| [0005](0005-tests-fuera-de-src.md)          | Los tests viven fuera de `src/`                          | 3    |
| [0006](0006-build-estricto-y-ci.md)         | Build estricto y CI en jobs separados                    | 2    |
| [0007](0007-secretos-gitleaks.md)           | Contención de secretos con gitleaks                      | 1    |
| [0008](0008-idempotencia-mutaciones.md)     | Llaves de idempotencia para mutaciones                   | 8    |
| [0009](0009-e2e-workflow-separado.md)       | E2E en un workflow separado y no bloqueante              | 3/12 |

## Formato

Cada ADR sigue: **Contexto** (qué problema real había), **Decisión** (qué se
hizo y dónde), **Consecuencias** (qué gana y qué queda pendiente). Son
inmutables: si una decisión cambia, se añade un ADR nuevo que la reemplaza, no se
edita el viejo.
