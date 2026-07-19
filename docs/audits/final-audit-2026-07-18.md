# Auditoría final — 2026-07-18 (FASE 22)

Estado de los bloqueantes del plan contra su **evidencia real**. Lo verde está en
`main` y verificado por CI en runner de GitHub (no solo local). Lo parcial o
pendiente se marca sin adornos: el plan es explícito en que 10/10 exige evidencia,
no afirmaciones.

Leyenda: ✅ hecho y verificado · 🟡 parcial · ⛔ pendiente (bloqueado por entorno o
acción externa).

## Seguridad

| Ítem                       | Estado | Evidencia / gap                                                                                                          |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| Sin secretos en el árbol   | ✅     | `.env.example` con placeholders; job `secrets` (gitleaks) en verde. ADR 0007.                                            |
| Historial sin secretos     | ⛔     | Pendiente `git filter-repo` + rotación de credencial. **No automatizable.**                                              |
| CSP / headers de seguridad | 🟡     | `src/middleware.ts` + headers en `next.config.ts` (trabajo del otro agente). Falta auditar CSP en `Report-Only`→enforce. |
| Cookie-only en producción  | 🟡     | Política de storage en `auth-session-policy` (rechaza tokens en cookie). Falta validar topología real.                   |
| CSRF                       | 🟡     | Header CSRF soportado (`getCsrfHeaderName` + `appendCsrfHeader`). Falta acordar contrato con backend.                    |
| PII enmascarada            | ✅     | `MaskedValue` + `pii-formatters`; revelado auditado. ADR / FASE 13.                                                      |
| Sin vulnerabilidades high  | ✅     | Job `audit` (`npm audit --audit-level=high`) en verde.                                                                   |
| Idempotencia               | ✅     | Header `Idempotency-Key` opt-in + `useIdempotentSubmit`. ADR 0008.                                                       |
| Query guards               | ✅     | 58 componentes migrados a `PermissionGate`→`Authorized*`. ADR 0002.                                                      |

## Código

| Ítem                    | Estado | Evidencia                                   |
| ----------------------- | ------ | ------------------------------------------- |
| TypeScript estricto     | ✅     | `tsc --noEmit` en job `quality`.            |
| ESLint                  | ✅     | `eslint .` en job `quality`.                |
| Build estricto          | ✅     | `next build` sin `ignore*`. ADR 0006.       |
| Máx. 300 líneas         | ✅     | `check-max-lines` en job `quality`.         |
| Límites de arquitectura | ✅     | `check-source-boundaries` en job `quality`. |

## Tests

| Ítem                | Estado | Evidencia                                                     |
| ------------------- | ------ | ------------------------------------------------------------- |
| Unit                | ✅     | Vitest; job `test`.                                           |
| Integración (MSW)   | ✅     | `client.test.ts` (401→refresh→retry) con MSW.                 |
| E2E                 | ✅     | Playwright smoke (login + axe); workflow `e2e.yml`. ADR 0009. |
| Contract            | ✅     | Validación runtime con Zod (`contract.ts`). ADR 0003.         |
| Accesibilidad (axe) | ✅     | axe en unit + en el smoke E2E. FASE 12.                       |
| Cobertura           | ✅     | Umbrales de trinquete (shared ~97%, qa-lab ~91%).             |
| Smoke post-deploy   | 🟡     | Smoke de login existe; falta el smoke contra staging real.    |

## UX

| Ítem                                | Estado | Evidencia                                     |
| ----------------------------------- | ------ | --------------------------------------------- |
| Navegación móvil                    | ✅     | `app-sidebar` / shell (otro agente). FASE 11. |
| Loading / Empty / Error / Forbidden | ✅     | `states.tsx` + error boundaries. FASE 19.     |
| Retry seguro                        | ✅     | `ErrorState onRetry` + `error.tsx reset`.     |
| Orden server-side                   | ✅     | `data-table` (otro agente). FASE 10.          |

## Operación

| Ítem             | Estado | Evidencia / gap                                                                                       |
| ---------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| CI obligatorio   | ✅     | `ci.yml` (5 jobs) verde en cada push.                                                                 |
| Observabilidad   | 🟡     | Adapter con redacción + wire de errores. Falta **sink real** (Sentry/endpoint) y web-vitals. FASE 18. |
| Staging          | ⛔     | Pendiente: ambiente de staging aislado y validado.                                                    |
| Rollback probado | ⛔     | Pendiente documentar y probar el rollback.                                                            |
| Web Vitals       | ⛔     | Pendiente medición en CI/producción.                                                                  |
| Release trazable | 🟡     | Commits atómicos por fase + CI; falta versionado/tag de release.                                      |

## Documentación

- ✅ ADRs 0001–0009 (`docs/architecture/adr/`).
- ✅ Baseline reproducible (`docs/audits/baseline-2026-07-15.md`).
- ✅ Coordinación entre agentes (`docs/AGENT-COORDINATION.md`).

## Lectura del criterio de recalificación (Sección 26 del plan)

El plan niega 10/10 si ocurre **cualquiera** de estas. Estado:

- Secretos expuestos → ✅ resuelto en el árbol (⛔ historial pendiente).
- Build ignora errores → ✅ resuelto.
- Sin CI → ✅ resuelto.
- Sin E2E → ✅ resuelto.
- Tokens persistidos en producción → 🟡 política lista; validar topología.
- Sorting local sobre paginación server-side → ✅ resuelto (FASE 10).
- Sin navegación móvil → ✅ resuelto (FASE 11).
- Sin protección PII → ✅ resuelto (FASE 13).
- Sin rollback → ⛔ pendiente.
- Sin staging validado → ⛔ pendiente.

## Conclusión honesta

El **grueso técnico bloqueante está cerrado y demostrado con CI verde**. Lo que
impide declarar 10/10 hoy es **operación y acciones no automatizables**: staging,
rollback probado, sink de observabilidad real, y las acciones manuales de
seguridad (rotar credencial + purgar historial). Ninguna es de código de la app;
son entorno, infraestructura y decisiones del owner.
