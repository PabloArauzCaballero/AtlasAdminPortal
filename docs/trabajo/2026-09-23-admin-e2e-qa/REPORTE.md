# Reporte — stack QA E2E de AdminPortal

## Cambio

El workflow E2E crea por fragmento PostgreSQL y Redis efímeros, descarga un commit fijo de AtlasBackend, aplica migraciones y seeds sintéticos, genera las claves dentro del runner y arranca el API. El PIN sale por el transporte webhook existente y llega al buzón local de Playwright. Se mantiene el verificador de pruebas saltadas y el informe consolidado.

La primera ejecución completa llegó a Playwright y confirmó que el login con PIN funciona. La identidad QA requiere permisos administrativos para recorrer todas las vistas; el backend los concede sólo en la base efímera. Las suites heredadas de producción y checklist usan ahora el mismo login de dos pasos con las credenciales generadas por el runner; dos pruebas de rol acotado siguen requiriendo una segunda identidad y se saltan explícitamente cuando no existe.

## Límites

El entorno dura sólo lo que la corrida en GitHub Actions. No usa cuentas humanas, servicios compartidos ni credenciales persistentes. La validación final requiere que la ejecución remota de ambos fragmentos y del informe termine en verde.
