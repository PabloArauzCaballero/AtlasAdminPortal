# Reporte — stack QA E2E de AdminPortal

## Cambio

El workflow E2E crea por fragmento PostgreSQL y Redis efímeros, descarga un commit fijo de AtlasBackend, aplica migraciones y seeds sintéticos, genera las claves dentro del runner y arranca el API. El PIN sale por el transporte webhook existente y llega al buzón local de Playwright. Se mantiene el verificador de pruebas saltadas y el informe consolidado.

## Límites

El entorno dura sólo lo que la corrida en GitHub Actions. No usa cuentas humanas, servicios compartidos ni credenciales persistentes. La validación final requiere que la ejecución remota de ambos fragmentos y del informe termine en verde.
