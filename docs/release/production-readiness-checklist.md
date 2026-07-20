# ATLAS Internal Frontend — Production Readiness Checklist

> **Verificado el 2026-07-19** contra entorno real (Postgres `:5433`, `AtlasBackend :3005` con
> 57 migraciones aplicadas, portal `:5273`) con Playwright: 17/17 E2E en verde. Lo marcado `[x]`
> tiene evidencia ejecutada, no inferida; la suite que lo sostiene es
> `tests/e2e/functional-checklist.spec.ts` + `tests/e2e/production-verification.spec.ts`.

## Bloqueantes antes de producción

- [x] Backend emite cookies internas `HttpOnly`, `SameSite` y con `Path` correcto. — `atlas_internal_access` y `atlas_internal_refresh` llegan `HttpOnly; SameSite=Lax; Path=/`, y el body del login no trae tokens. **`Secure` no aplica en local (http): queda por observar en el despliegue https.**
- [x] Refresh token rotation activa y logout revoca sesión del lado servidor. — el refresh se re-emite con valor distinto en cada uso y **reusar el anterior devuelve 401**; tras logout el refresh previo también devuelve 401.
- [x] `NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE=cookie`. — `getInternalAuthStorageMode()` **falla cerrado** a `cookie` (`auth-session-policy.ts`), así que un despliegue que olvide la variable no reintroduce tokens en el navegador. Verificado además que `sessionStorage` no guarda `accessToken`/`refreshToken`.
- [ ] `NEXT_PUBLIC_API_BASE_URL` apunta al API interno correcto. — el **valor** depende del despliegue, pero ya no puede faltar en silencio: `assertApiBaseUrlConfigured()` (`shared/api/config.ts`) hace fallar la ruta de peticiones con un mensaje accionable si la variable no está y el ambiente es `production`, en vez de caer al default de desarrollo y que el navegador del operador llame a su propio `localhost`. La validación **no** vive en `getApiBaseUrl()` porque `src/middleware.ts` lo usa para la CSP en cada request: lanzar allí convertiría el error de configuración en un 500 total sin UI.
- [ ] `NEXT_PUBLIC_ATLAS_ENVIRONMENT` refleja el ambiente real. — depende del despliegue.
- [ ] Permisos `internal.exports.download`, `systems.stress.execute`, `reporting.execute` y `dataQuality.rules.manage` seedados correctamente. — **3 de 4 OK** (`systems.stress.execute`, `reporting.execute`, `dataQuality.rules.manage` existen activos y asignados a roles). **`internal.exports.download` NO existe en el catálogo de permisos**: ver "Bloqueante abierto" abajo.
- [ ] Exportaciones usan URL firmada temporal o endpoint de descarga auditado. — contrato de backend.
- [x] Stress QA está bloqueado en producción salvo política explícita. — ya está implementado y fijado con tests: `assertRequestAllowed()` (`features/qa-lab/qa-safety.ts`) lanza `"Producción readonly solo permite dry-run desde el QA Lab."` cuando el ambiente es `PRODUCTION_READONLY` y no es dry-run. El guard está en el choke point que atraviesan **ambos** runners antes de cualquier fetch (`direct-runner.ts`, `stress-runner.ts`), así que no se evade tocando la UI. Cubierto por `direct-runner.test.ts` (casos bloqueado y permitido) y `stress-runner.test.ts`.
- [ ] Ejecución de reportes pesados y reglas pesadas corre como job observable. — backend.
- [x] Auditoría registra acciones críticas con `requestId`. — todas las respuestas del API interno incluyen `requestId`, y el portal lo muestra al usuario en los errores (visto en el error de login inválido).

## Bloqueante abierto: falta seedear `internal.exports.download`

Confirmado consultando el catálogo real (`iam.internal_permissions`): el permiso **no existe**, por lo
que ningún rol lo tiene y ninguna sesión lo incluye. `ExportDownloadAction` está gateado con
`<PermissionGate permissions={["internal.exports.download"]} fallback={null}>`, así que hoy el botón
"Abrir archivo" **está oculto para todos**: la descarga de exportaciones es inusable desde el portal.
Falla cerrado (no hay fuga de datos), pero la función no sirve.

Fix (en `AtlasBackend`, siguiendo el patrón de `production/20260704121000-seed-internal-rbac.ts`, que
es idempotente con `ON CONFLICT (permission_code)`): dar de alta el permiso con
`module_code='internal'`, `resource_code='internal_export'`, `action_code='download'` y
`risk_level='CRITICAL'`, y **asignarlo solo a los roles autorizados a extraer datos sensibles**.
Qué roles exactamente es una decisión de seguridad del owner, no un default técnico: por eso queda
sin resolver aquí. Lo mínimo razonable es `SUPER_ADMIN`; cualquier rol adicional debería ser una
decisión explícita y auditada.

## Validación funcional con backend real

Todos verificados el 2026-07-19 con Playwright contra el backend levantado (ver specs citados arriba).

- [x] Login interno correcto.
- [x] Login inválido muestra error humano y request ID si existe. — muestra "No se pudo iniciar sesión" + `Request ID: …`, sin volcados técnicos.
- [x] Restore de sesión desde cookie tras refresh del navegador. — tras `reload()` sigue autenticado en la misma ruta.
- [x] Expiración de sesión redirige a login sin loop. — al perder las cookies, una sola redirección a `/internal/login` y se queda ahí.
- [x] Logout limpia sesión local y servidor. — la cookie de access desaparece y el refresh previo pasa a devolver 401.
- [x] Usuario sin permiso no ve acción restringida. — probado con un `RISK_ANALYST` (3 permisos): no se le ofrece la administración de usuarios.
- [x] Usuario sin permiso recibe 403 controlado si entra por URL directa. — `/internal/settings/users/new` muestra "Acceso restringido" y no filtra el formulario.
- [x] Búsqueda global devuelve enlaces navegables. — 81 enlaces internos, ninguno protocol-relative (`//host`).
- [x] Release readiness viene del backend y no se calcula en navegador. — se observa `GET /api/v1/internal/release-readiness` en la red al abrir la pantalla.
- [ ] Descarga de exportación exige confirmación y permiso dedicado. — el código ya exige ambos (`ConfirmDialog` + `PermissionGate`), pero **no se puede ejercitar end-to-end** hasta que se seedee `internal.exports.download` (ver bloqueante arriba).

## Validación técnica

```bash
npm run clean
npm run validate
npm run build
npm audit --audit-level=high
```

Resultado esperado:

```txt
max-lines: OK
source-boundaries: OK
format: OK
type-check: OK
lint: OK
build: OK
audit high/critical: OK
```

## Riesgos de largo plazo a monitorear

- Vulnerabilidad moderate transitiva de Next/PostCSS hasta que exista parche compatible sin downgrade.
- Crecimiento del menú: si el negocio quiere orden/labels 100% administrables, crear endpoint de navegación interna.
- Volumen alto: mover facetas, contadores y búsquedas complejas a agregados server-side.
- Contratos inestables: congelar OpenAPI antes de producción para evitar adaptadores defensivos permanentes.
