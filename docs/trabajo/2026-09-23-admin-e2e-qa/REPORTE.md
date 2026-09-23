# Reporte — stack QA E2E de AdminPortal

## Cambio

El workflow E2E crea por fragmento PostgreSQL y Redis efímeros, descarga un commit fijo de AtlasBackend, aplica migraciones y seeds sintéticos, genera las claves dentro del runner y arranca el API. El PIN sale por el transporte webhook existente y llega al buzón local de Playwright. Se mantiene el verificador de pruebas saltadas y el informe consolidado.

La primera ejecución completa llegó a Playwright y confirmó que el login con PIN funciona. La identidad QA requiere permisos administrativos para recorrer todas las vistas; el backend los concede sólo en la base efímera. Las suites heredadas de producción y checklist usan ahora el mismo login de dos pasos con las credenciales generadas por el runner; dos pruebas de rol acotado siguen requiriendo una segunda identidad y se saltan explícitamente cuando no existe.

El setup refresca el catálogo técnico por el endpoint de gobierno del API después de entrar con PIN. El backend refleja por separado las tablas y columnas del esquema físico. La prueba de reuso de refresh token invalida correctamente las sesiones del actor; tras verificarlo, renueva el estado de sesión compartido para que las pruebas siguientes ejerciten sus propias vistas. Los tutoriales comparten la sesión del setup.

El catálogo OpenAPI se descubre por el endpoint real del backend y las pruebas de QA LAB resuelven los IDs de la base actual por método y ruta. Para ejercitar el filtro de los tres bloques sin depender de servicios compartidos, el runner sirve manifiestos de contrato sintéticos de Decision Engine y ERP. El backend los importa por su API de federación real, con token del actor para el Motor y una llave efímera para ERP. Esto cubre el consumidor y la interfaz; no sustituye la prueba entre despliegues de los productores.

Los fallos de login pueden dejar el valor de contraseña en el contexto de error de Playwright. CI desactiva trazas y capturas, sólo publica blobs cuando E2E y el verificador pasan, y antes de subirlos busca la clave en cada ZIP, incluidos ZIPs anidados. Los artefactos de diagnóstico de las primeras corridas se eliminaron.

## Límites

El entorno dura sólo lo que la corrida en GitHub Actions. No usa cuentas humanas, servicios compartidos ni credenciales persistentes. La validación final requiere que la ejecución remota de ambos fragmentos y del informe termine en verde.
