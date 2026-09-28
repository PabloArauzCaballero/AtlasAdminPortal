# Plan — Atlas Assist en el portal de operaciones

- Fecha: 2026-09-28 · Repos afectados: AtlasAdminPortal (rama `feat/asistente-en-portales`), AtlasAIService (solo `src/modules/assist/surfaces/admin-portal.catalog.ts`) · Predecesor: el asistente de la app del cliente (`AtlasFrontend/apps/consumer-app`)
- Resultado observable: en toda pantalla con sesión del portal, el personal interno ve abajo a la derecha el botón «Asistente de Atlas», abre un panel con su historial y recibe respuestas sobre cómo usar el portal.
- Kill-test: abrir `/internal/operations/work-queue` con sesión y no encontrar el botón por su rol y nombre, o que el panel no muestre la respuesta de `POST /internal/assist/chat`.

## Alcance

- IN: botón y panel (`src/features/assist/*`), montaje en `AppShell`, plazo propio por llamada y `Retry-After` en el cliente HTTP compartido, tests unitarios y evidencia E2E con dobles, catálogo `ADMIN_PORTAL_CATALOG`.
- OUT: el backend de Core (`/internal/assist/*`, lo hace otro carril), el registro del catálogo y los tests de AtlasAIService, commit, push y PR.
- Ambigüedades registradas:
  - «Si `suggestHandoff`, en portales internos nada extra salvo que exista un canal interno real». Supuesto: la «Bandeja de casos» de Soporte es la de clientes y comercios, así que no es un canal interno y no se añade enlace. A confirmar con quien integra.
  - `Retry-After` en respuestas de otro origen: Core no lo expone por CORS. Supuesto: se usa si llega y, si no, 2 s (el valor que pone Core). A confirmar con el carril de Core.

## H1 — El asistente aparece y contesta en el portal

**CA:** Dado un operador con sesión, cuando abre cualquier pantalla interna, entonces ve «Asistente de Atlas»; al abrirlo ve su historial y el aviso fijo, y al preguntar ve «Pensando…» y luego la respuesta. Con el asistente apagado (404) el botón sigue y el panel lo explica con el campo deshabilitado.
**DoD:** `yarn type-check`, `yarn lint`, `yarn test` en verde; E2E de evidencia en verde; capturas en móvil, tablet y escritorio revisadas.
**Estado:** HECHO (contra dobles del backend; ver REPORTE)

### H1.S1 — Cliente y lógica

**CA:** Dado el contrato de Core, cuando se pregunta, entonces se llama a `POST /internal/assist/chat` con `surface`, `clientMessageId` UUID v4 y `screen`, y el 409 se reintenta con la misma llave.
**DoD:** `npx vitest run tests/unit/features/assist` en verde.
**Estado:** HECHO

| ID       | Microtarea                                      | CA (binario)                           | DoD                                     | Estado |
| -------- | ----------------------------------------------- | -------------------------------------- | --------------------------------------- | ------ |
| H1.S1.M1 | Plazo propio por llamada (`timeoutMs`)          | El chat espera 40 s en vez de 12 s     | `yarn test` (transport/client) en verde | HECHO  |
| H1.S1.M2 | `retryAfterMs` en `AtlasApiError`               | Un 409 con `Retry-After: 2` da 2000 ms | test «conserva el Retry-After» en verde | HECHO  |
| H1.S1.M3 | Servicios `askAssist` / `getAssistConversation` | Ruta, cuerpo y query exactos           | `assist-services.test.ts` en verde      | HECHO  |
| H1.S1.M4 | Ruta → sección visible (`assistScreenFor`)      | Nombre del menú, sin ids, ≤80          | `assist-services.test.ts` en verde      | HECHO  |
| H1.S1.M5 | Hook `useAssist` (historial, 409, errores, 404) | Misma llave en los reintentos          | `assist-fab.test.tsx` en verde          | HECHO  |

### H1.S2 — Interfaz

**CA:** Dado el panel abierto, cuando se escribe y se pulsa Enter, entonces se envía; Shift+Enter hace salto; Escape cierra y devuelve el foco.
**DoD:** `assist-fab.test.tsx` y `asistente.evidencia.spec.ts` en verde; capturas revisadas.
**Estado:** HECHO

| ID       | Microtarea                           | CA (binario)                      | DoD                          | Estado |
| -------- | ------------------------------------ | --------------------------------- | ---------------------------- | ------ |
| H1.S2.M1 | Botón flotante montado en `AppShell` | Visible con sesión, no en login   | E2E «el botón está» en verde | HECHO  |
| H1.S2.M2 | Panel sobre `DialogShell`            | Foco atrapado, Escape, responsive | E2E + unit en verde          | HECHO  |
| H1.S2.M3 | Relleno inferior del `main`          | El botón no tapa la última acción | Captura escritorio revisada  | HECHO  |
| H1.S2.M4 | Prueba visual en 3 viewports         | Capturas sin defectos             | Capturas revisadas           | HECHO  |

### H1.S3 — Catálogo en AtlasAIService

**CA:** Dado el portal en `dev` 4cf5515, el catálogo tiene entre 25 y 60 hechos con textos reales y `knowledgeVersion` `admin-portal-assist-v1-4cf5515`.
**DoD:** conteo de hechos, ids únicos con prefijo `ADM-`, `cues` sin tildes.
**Estado:** HECHO

| ID       | Microtarea                         | CA (binario)             | DoD                        | Estado |
| -------- | ---------------------------------- | ------------------------ | -------------------------- | ------ |
| H1.S3.M1 | Escribir `admin-portal.catalog.ts` | 25–60 hechos, ids únicos | script de conteo (REPORTE) | HECHO  |

## Riesgos y bloqueos previstos

| Riesgo                                     | Impacto                           | Mitigación                                                                                       |
| ------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| Core aún no publica `/internal/assist/*`   | Sin prueba contra el backend real | Dobles en tres niveles (respuesta, 409/límite, 400/404/red) y pendiente de integración declarado |
| La API en otro origen oculta `Retry-After` | Espera fija de 2 s                | Documentado; se usa la cabecera si llega                                                         |
