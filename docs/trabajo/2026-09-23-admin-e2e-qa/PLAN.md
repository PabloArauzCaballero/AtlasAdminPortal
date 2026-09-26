# Entorno QA efímero para E2E de AdminPortal

## Diseño

Cada fragmento Playwright tendrá PostgreSQL 16 y Redis 7 efímeros. El workflow obtiene un commit fijo de AtlasBackend con el seed QA, aplica migraciones, siembra datos sintéticos, crea una contraseña aleatoria sólo en memoria del runner y levanta el API real con correo webhook hacia `BuzonPin`. Construye AdminPortal con `NEXT_PUBLIC_API_BASE_URL` local y ejecuta los E2E contra el standalone del mismo commit. El runner desecha la base y la credencial al terminar; no hay acceso a producción ni cuenta humana.

## Alcance

`.github/workflows/e2e.yml`, scripts de preparación/health del E2E, documentación y pruebas de configuración. No se alteran las aserciones ni la política de skips.

## H1 — E2E real con dos factores

CA: login y suite Playwright ejercitan frontend y backend reales en CI; cada fragmento produce informe y el verificador rechaza skips excesivos. DoD: dos fragmentos y consolidación verdes en CI.

### H1.S1 — Stack aislado

CA: servicios y backend arrancan con estado sintético y SHA fijado. DoD: workflow remoto verde.

- [ ] H1.S1.M1: servicios PostgreSQL/Redis y checkout backend. CA: health de ambos. DoD: CI.
- [ ] H1.S1.M2: migración, demo y seed QA. CA: login del actor recién creado con PIN real. DoD: CI.
- [ ] H1.S1.M3: API y portal listos por polling, no por espera fija. CA: ambos health responden antes de E2E. DoD: CI.
- [ ] H1.S1.M4: artefactos y skip gate conservados. CA: informe consolidado y porcentaje bajo el umbral. DoD: CI.

## Ambigüedad

El entorno pedido puede significar un despliegue QA persistente. Se elige un stack efímero por PR porque no existe despliegue ni secretos QA y el objetivo inmediato es proteger el gate de `dev`. Si se requiere probar un despliegue persistente, ese smoke se añade después del despliegue y usa una identidad distinta.
