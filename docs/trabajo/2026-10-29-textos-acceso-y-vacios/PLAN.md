# Plan — Textos de acceso y estados vacíos (criterios de marketingskills)

- Fecha: 2026-10-29 · Repos afectados: AtlasAdminPortal (este plan); ERP, Dashboards y DecisionEngine abren el suyo · Predecesor: `docs/trabajo/2026-10-28-rediseno-mobile/` (el rediseño móvil)
- Resultado observable: quien entra al portal y quien abre una lista vacía lee qué pasó y qué hacer, con la salida que corresponde (quitar filtros o esperar), sin textos que mientan.
- Kill-test: abrir `/internal/audit` (o cualquier lista vacía sin texto propio) y leer «Aún no hay configuración registrada para este apartado», que es falso en una pantalla de auditoría.

## Cómo se aplican las skills (decisión registrada)

Se leyeron `copywriting`, `signup`, `onboarding` y `copy-editing` de marketingskills. Son skills de captación; un portal interno no tiene conversión que optimizar, así que **solo se aplican las reglas transferibles**:

| Regla de la skill                                                                  | Cómo se usa aquí                                                                                         |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Diagnosticar antes de editar (modo B/C: «cambia solo lo que se pidió»)             | El acceso de este portal ya está bien escrito; **no se reescribe**. Solo ediciones puntuales con motivo. |
| No inventar afirmaciones                                                           | No se añaden promesas (tiempos, reenvíos, contactos) que el sistema no cumple o que no consta.           |
| Errores específicos con salida; no vaciar el formulario                            | Se arreglan los mensajes que no dicen qué hacer.                                                         |
| Estados vacíos: explican para qué sirve el área y dan una acción                   | Se separan «vacío de verdad» y «los filtros no coinciden»; son dos salidas distintas.                    |
| Sin «huellas de IA» (contraste «no X, sino Y», listas de negaciones, rimbombancia) | Textos llanos y específicos.                                                                             |
| **No aplicable**                                                                   | Urgencia, prueba social, «gratis, sin tarjeta», A/B, medición de conversión.                             |

La voz de cada portal se conserva (aquí: tú).

## Alcance

- IN: mensajes de error genéricos del acceso (`login-page`, `login-pin-form`), pista de «Organización» y ayuda cuando el código no llega; el texto vacío por defecto de `DataTable`; los textos vacíos de las 8 tablas que pueden estar vacías y no tenían texto propio.
- OUT: rehacer el acceso, el héroe de la pantalla de acceso, textos de las 90+ pantallas que ya traen su texto vacío, backend, permisos, añadir un «reenviar código» (no existe en el backend consultado; sería funcionalidad nueva).
- Ambigüedades registradas:
  - «Pídelo a quien administra tu acceso»: no consta en el repo a quién se le pide el código de organización. Supuesto: texto neutro, sin nombrar un equipo. A confirmar con quien opera el portal.
  - El PIN: «Usar otra cuenta» vuelve al formulario y es también la única forma de pedir otro código. Se dice en la ayuda, sin cambiar el botón.

## Hallazgos (formato de la skill `signup`: problema, impacto, arreglo, prioridad)

| #   | Problema                                                                              | Impacto                                                          | Arreglo                                                 | Prioridad |
| --- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- | --------- |
| 1   | `DataTable` por defecto dice «Aún no hay configuración registrada para este apartado» | Falso fuera de pantallas de configuración                        | Texto neutro y verdadero                                | Alta      |
| 2   | 8 tablas con filtros o datos vivos usan ese texto por defecto                         | No orienta: no distingue «sin datos» de «filtros sin resultados» | Texto propio, con y sin filtros                         | Alta      |
| 3   | Error de red al iniciar sesión: «No se pudo iniciar sesión.»                          | No dice qué hacer                                                | «…Revisa tu conexión e inténtalo de nuevo.»             | Media     |
| 4   | Error de red al verificar: «No se pudo verificar el código.»                          | Ídem                                                             | Ídem                                                    | Media     |
| 5   | Pista «Usa el código de organización de tu ambiente interno»                          | No dice qué es ni dónde obtenerlo                                | Qué es y qué hacer si no se conoce                      | Media     |
| 6   | Pantalla del PIN sin ayuda si el correo no llega                                      | Atascado sin salida                                              | Una frase: revisar correo no deseado o volver a empezar | Media     |

## H1 — Textos de acceso y vacíos de AdminPortal

**CA:** Dado un operador, cuando falla la red al entrar o al verificar, ve qué hacer; cuando una tabla está vacía ve un texto verdadero que distingue «sin datos» de «filtros sin resultados».
**DoD:** `yarn validate` exit 0 · `yarn test` verde · capturas de un estado vacío con y sin filtros · textos de `evidencia/textos.md`.
**Estado:** HECHO

| ID    | Microtarea                                                                   | CA (binario)                                                   | DoD (comando de verificación)                | Estado |
| ----- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------- | ------ |
| H1.M1 | Texto vacío por defecto de `DataTable` verdadero                             | Ya no menciona «configuración»                                 | `vitest data-table` + `grep` del texto viejo | HECHO  |
| H1.M2 | Textos vacíos con/sin filtros en las 8 tablas                                | Cada una dice qué es y qué hacer; con filtros ofrece quitarlos | `vitest` de la utilidad + capturas           | HECHO  |
| H1.M3 | Errores de red del acceso con salida; pista de «Organización»; ayuda del PIN | Los 4 textos nuevos aparecen y no hay promesas falsas          | `vitest` de las dos pantallas                | HECHO  |

## Riesgos y bloqueos previstos

| Riesgo                                      | Impacto              | Mitigación                                                                                         |
| ------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| Un texto afirma algo que el sistema no hace | Pérdida de confianza | Cada texto se contrasta con la descripción de su pantalla; nada de tiempos ni contactos inventados |
| Pruebas que fijan los textos viejos         | Rojo en la suite     | Se actualizan con el texto nuevo (no se borran ni se debilitan)                                    |
| Límite de 300 líneas                        | `max-lines`          | Utilidad pequeña y separada para los textos                                                        |
