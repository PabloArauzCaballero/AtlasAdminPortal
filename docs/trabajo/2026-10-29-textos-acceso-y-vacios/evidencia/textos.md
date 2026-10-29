# Textos cambiados (antes → después)

Criterios de marketingskills aplicados: `copywriting` (claro, específico, sin afirmaciones sin respaldo), `signup` (errores con salida, ayuda cuando no llega el código), `onboarding` (el vacío explica para qué sirve el área y qué hacer) y `copy-editing` (modo C: cambiar solo lo necesario).

## Acceso

| Dónde | Antes | Después | Por qué |
| ----- | ----- | ------- | ------- |
| Login, fallo que no es del servidor | No se pudo iniciar sesión. | No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo. | Un error sin salida |
| Login, pista de «Organización» | Usa el código de organización de tu ambiente interno. | Es el código de tu organización en ATLAS. Si no lo conoces, pídelo a quien administra tu acceso. | No decía qué es ni dónde obtenerlo |
| PIN, fallo que no es del servidor | No se pudo verificar el código. | No se pudo verificar el código. Revisa tu conexión e inténtalo de nuevo. | Ídem |
| PIN, cabecera | …Vence en N minutos y sólo puede usarse una vez. | …Si no llega, revisa la carpeta de correo no deseado o pulsa «Usar otra cuenta» para volver a empezar. | Sin salida si el correo no llega; no se promete un «reenviar» que no existe |

No se tocaron: el héroe, «Entrar al portal interno», «¿Olvidaste tu contraseña?», las validaciones, el aviso de sesión cerrada ni la pantalla de servicio no disponible (ya dicen qué pasó y qué hacer).

## Estados vacíos

| Dónde | Sin filtros | Con filtros |
| ----- | ----------- | ----------- |
| `DataTable` (por defecto) | Cuando haya registros en esta vista, aparecerán aquí. (antes: «Aún no hay configuración registrada para este apartado.», falso fuera de configuración) | — |
| Artefactos activos | El motor no tiene artefactos publicados. | Ningún artefacto coincide con tu búsqueda. |
| Auditoría de acciones | Todavía no hay acciones auditadas. | Ninguna acción auditada coincide con los filtros. |
| Auditoría por solicitud | No hay registros para esta solicitud. + «Comprueba que el código de referencia esté completo…» | — |
| Corridas de suites QA | Todavía no hay corridas de suites QA. | Ninguna corrida coincide con los filtros. |
| Pasos de una corrida | Esta corrida todavía no registró pasos. + «…aparecerán a medida que se ejecuten.» | — |
| Perfiles de carga | Todavía no hay perfiles de carga. | Ningún perfil de carga coincide con los filtros. |
| Matriz de cobertura | No hay rutas que necesiten prueba de carga. | Ninguna ruta coincide con tu búsqueda. |
| Corridas de carga | Todavía no hay corridas de carga. | Ninguna corrida de carga coincide con los filtros. |
| Catálogo de datos | El catálogo todavía no tiene tablas registradas. | Ninguna tabla coincide con tu búsqueda. |

Con filtros, la descripción es siempre: «Quita o cambia los filtros de arriba para ver más registros.»
