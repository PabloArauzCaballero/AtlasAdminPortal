# ATLAS Internal Frontend — Production Readiness Checklist

## Bloqueantes antes de producción

- [ ] Backend emite cookies internas `HttpOnly`, `Secure`, `SameSite` y con dominio correcto.
- [ ] Refresh token rotation activa y logout revoca sesión del lado servidor.
- [ ] `NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE=cookie` en producción.
- [ ] `NEXT_PUBLIC_API_BASE_URL` apunta al API interno correcto.
- [ ] `NEXT_PUBLIC_ATLAS_ENVIRONMENT` refleja el ambiente real.
- [ ] Permisos `internal.exports.download`, `systems.stress.execute`, `reporting.execute` y `dataQuality.rules.manage` seedados correctamente.
- [ ] Exportaciones usan URL firmada temporal o endpoint de descarga auditado.
- [ ] Stress QA está bloqueado en producción salvo política explícita.
- [ ] Ejecución de reportes pesados y reglas pesadas corre como job observable.
- [ ] Auditoría registra acciones críticas con `requestId`.

## Validación funcional con backend real

- [ ] Login interno correcto.
- [ ] Login inválido muestra error humano y request ID si existe.
- [ ] Restore de sesión desde cookie tras refresh del navegador.
- [ ] Expiración de sesión redirige a login sin loop.
- [ ] Logout limpia sesión local y servidor.
- [ ] Usuario sin permiso no ve acción restringida.
- [ ] Usuario sin permiso recibe 403 controlado si entra por URL directa.
- [ ] Búsqueda global devuelve enlaces navegables.
- [ ] Release readiness viene del backend y no se calcula en navegador.
- [ ] Descarga de exportación exige confirmación y permiso dedicado.

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
