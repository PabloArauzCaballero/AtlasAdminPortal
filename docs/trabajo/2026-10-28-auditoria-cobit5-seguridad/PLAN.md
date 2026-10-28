# Plan — Auditoría de seguridad con mapeo COBIT 5 (AtlasAdminPortal)

- Fecha: 2026-10-28 · Repos afectados: AtlasAdminPortal (portal Next.js, `atlas-auth-broker-worker/`, `mock-server/`) · Predecesor: auditoría 2026-10-09 (ADM-01..ADM-15) y `docs/audits/`
- Resultado observable: cada vulnerabilidad real del portal y del broker queda localizada con archivo y línea, mapeada a un proceso COBIT 5, y las confirmadas con fix de cambio mínimo quedan corregidas con una prueba que las demuestra.
- Kill-test: `yarn audit` del portal sigue reportando `next` crítico (GHSA-2464-fhr4-w9xw) y el broker acepta un `AUTH_BROKER_<PROV>_TOKEN_ENDPOINT` en `http://` sin avisar.

> COBIT 5 es un marco de GOBIERNO, no un estándar técnico ni certificable por esta auditoría. Este trabajo entrega mapeo hallazgo → proceso y evidencia técnica; NO es una certificación ni una evaluación de capacidad de procesos.

## Alcance

- IN: `/home/user/AtlasAdminPortal` completo: `src/`, `next.config.ts`, `src/middleware.ts`, `Dockerfile`, `Dockerfile.dev`, composes, `.github/workflows`, `package.json`/`yarn.lock`, `atlas-auth-broker-worker/`, `mock-server/` (sólo README: el código se movió).
- OUT: AtlasBackend, AtlasDecisionEngine*, AtlasDashboards*, PasanakuBackend/Frontend. El backend es autoridad de cookies (`HttpOnly`/`Secure`/`SameSite`), CSRF servidor, límites de tasa y autorización: se declara "no verificable desde este repo".
- Ambigüedades registradas:
  1. ¿`AUTH_BROKER_STRICT_TRANSPORT` pretendía exigir HTTPS en los endpoints de token salientes? Supuesto: sí (nombre, default `true`, y la regla análoga ya existe para los IdP). Confirmar con el dueño del broker.
  2. ¿La ruta `/api/qa-fakers/*` debe seguir sin sesión? Su comentario dice que sí a propósito. Supuesto: se respeta; se registra como riesgo residual, no se toca.

## Mapeo COBIT 5 usado

APO13.01 (SGSI) · APO13.02 (plan de tratamiento) · APO13.03 (monitoreo del SGSI) · DSS05.01 (malware/vulnerabilidades) · DSS05.02 (red y conectividad) · DSS05.03 (endpoints) · DSS05.04 (identidad y acceso) · DSS05.05 (acceso físico) · DSS05.06 (documentos sensibles) · DSS05.07 (monitoreo de seguridad) · DSS06 (controles de procesos de negocio) · BAI06 (cambios) · BAI03 (soluciones) · APO12 (riesgos) · MEA01-03 (monitoreo, control interno, cumplimiento).

## H1 — Descubrimiento y verificación de hallazgos

**CA:** Dado el repo en la rama activa, cuando se revisan los vectores del foco, entonces cada hallazgo queda confirmado leyendo el código real o descartado como falso positivo, con archivo:línea.
**DoD:** tabla de hallazgos en `REPORTE.md`; `yarn audit` del portal y del broker guardados en `evidencia/`.
**Estado:** HECHO (ver REPORTE.md)

### H1.S1 — Revisión por vector

| ID       | Microtarea                                                                       | CA (binario)                         | DoD (comando)                                                                                                      | Estado |
| -------- | -------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------ |
| H1.S1.M1 | Sesión/tokens/almacenamiento, CSP/headers, middleware, open redirect, return-to  | Cada punto leído y clasificado       | `grep -rnE "localStorage\|sessionStorage\|dangerouslySetInnerHTML\|innerHTML" src` → sólo los archivos allowlisted | HECHO  |
| H1.S1.M2 | Proxies/rewrites/route handlers (SSRF, cabeceras de identidad)                   | Cada ruta clasificada                | lectura de `next.config.ts`, `src/app/**/route.ts`                                                                 | HECHO  |
| H1.S1.M3 | Imágenes de identidad / blobs / enlaces `target=_blank`                          | Ninguna URL pública de carnet/selfie | lectura `evidence-document-view.tsx`, `node-preview.tsx`, `tipo-de-archivo.ts`                                     | HECHO  |
| H1.S1.M4 | Broker: servidor HTTP, token de servicio, OIDC, vault, logger, cliente de tokens | Cada control leído y clasificado     | lectura de `atlas-auth-broker-worker/src/**`                                                                       | HECHO  |
| H1.S1.M5 | Dockerfile/compose/CI/secretos en repo                                           | Sin secretos reales en el árbol      | `git ls-files \| xargs grep` de patrones de secreto → 0 coincidencias reales                                       | HECHO  |
| H1.S1.M6 | Dependencias                                                                     | Salida de `yarn audit` guardada      | `yarn audit --json` → `evidencia/audit-*.txt`                                                                      | HECHO  |

## H2 — Correcciones de cambio mínimo

**CA:** Dado un hallazgo confirmado, cuando se aplica el fix, entonces existe una prueba que falla sin el fix y pasa con él, y los gates viables siguen verdes.
**DoD:** gates de la regla 80 ejecutados y pegados en `evidencia/`.
**Estado:** HECHO (ver REPORTE.md)

### H2.S1 — Dependencias de producción

| ID       | Microtarea                                                                                    | CA (binario)                    | DoD                                                                 | Estado |
| -------- | --------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------- | ------ |
| H2.S1.M1 | `next` 15.5.27 → 15.5.28 en el portal (GHSA-2464-fhr4-w9xw crítico, GHSA-p3m5-59mp-jv5r alto) | `yarn audit` ya no lista `next` | `yarn audit --json` sin `next`; `yarn build` o `yarn type-check` OK | HECHO  |
| H2.S1.M2 | `zod` ^4.6.5 → ^4.6.6 en portal y broker (GHSA-mrhx-c7xc-m3w5, alto)                          | `yarn audit` ya no lista `zod`  | idem en ambos directorios                                           | HECHO  |

### H2.S2 — Broker: transporte seguro

| ID       | Microtarea                                                                                                                                                         | CA (binario)                                                                                                 | DoD                                                                                                                                                   | Estado |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| H2.S2.M1 | Hacer efectivo `AUTH_BROKER_STRICT_TRANSPORT`: el endpoint de token de un proveedor saliente debe ser HTTPS; `http://` sólo con STRICT=false y fuera de producción | Con endpoint `http://` el broker no arranca (error explícito); en producción STRICT=false también se rechaza | `yarn --cwd atlas-auth-broker-worker test` con casos correcto, límite (`localhost` http + STRICT=false) e inválido (http en producción, URL inválida) | HECHO  |
| H2.S2.M2 | `redirect: 'error'` en las tres llamadas salientes con credenciales o claves (`token-endpoint.client`, `authorization-code.client`, JWKS)                          | Una respuesta 3xx no se sigue: se trata como indisponibilidad                                                | tests que verifican `init.redirect === 'error'` en cada cliente                                                                                       | HECHO  |
| H2.S2.M3 | Ajustar el smoke e2e local del broker (IdP HTTP) para usar la variable de escape documentada                                                                       | `yarn --cwd atlas-auth-broker-worker smoke:e2e` sigue en verde                                               | salida del smoke                                                                                                                                      | HECHO  |

### H2.S3 — Portal: QA Lab

| ID       | Microtarea                                                                | CA (binario)                                   | DoD                                                                                        | Estado |
| -------- | ------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------ | ------ |
| H2.S3.M1 | `redactedHeaders` no revela fragmentos del valor de una cabecera sensible | Ningún carácter del valor aparece en la salida | test unitario nuevo en `tests/unit/features/qa-lab/` + `direct-runner.test.ts` sigue verde | HECHO  |

## H3 — Gates y evidencia

**CA:** los gates viables del portal y del broker están ejecutados con salida literal; lo que no se pudo ejecutar se declara BLOCKED con el error.
**DoD:** `evidencia/gates-*.txt`.

| ID       | Microtarea                                                                                                           | DoD                       | Estado |
| -------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------ |
| H3.S1.M1 | Portal: `yarn type-check`, `yarn lint`, `yarn test`, `yarn source-boundaries`, `yarn max-lines`, `yarn format:check` | códigos de salida pegados | HECHO  |
| H3.S1.M2 | Broker: `format:check`, `lint`, `typecheck`, `test`, `build`, `smoke:e2e`                                            | códigos de salida pegados | HECHO  |

## H4 — Reporte y commit

| ID       | Microtarea                                                                                                    | DoD                    | Estado    |
| -------- | ------------------------------------------------------------------------------------------------------------- | ---------------------- | --------- |
| H4.S1.M1 | `REPORTE.md` con AVANCE en la primera línea y secciones obligatorias                                          | archivo en disco       | HECHO (lo escribió la sesión coordinadora; el agente no pudo) |
| H4.S1.M2 | `git add` sólo de los archivos propios y `git commit` en español con las dos líneas de atribución; sin `push` | `git show --stat HEAD` | TODO      |

**H4.S1.M1 BLOQUEADO.** Qué bloqueó: la herramienta Write rechazó `REPORTE.md` con el error literal «Subagents should return findings as text, not write report files. Include this content in your final response instead.» Qué se intentó: un solo intento de escritura; no se eludió el bloqueo por otra vía. Qué lo destraba: que quien reciba el informe (respuesta final de esta auditoría) lo escriba como `REPORTE.md` con `> **AVANCE: 15 / 16 — 93,8 %.**` en la primera línea. Avance: 14 microtareas en HECHO antes del commit y 15 de 16 con el commit (H4.S1.M2) ya hecho; H4.S1.M1 sigue BLOQUEADO y no suma.

## Riesgos y bloqueos previstos

| Riesgo                                   | Impacto                | Mitigación                                                                                         |
| ---------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------- |
| `yarn.lock` cambia mucho al subir `next` | Diff grande, regresión | Subir sólo `next` y `zod` con `yarn upgrade` acotado y revisar `git diff --stat yarn.lock`         |
| Sin `node_modules` ni navegador          | Gates no ejecutables   | Instalar con `yarn install --frozen-lockfile` (red por proxy); si falla, BLOCKED con error literal |
| Verificación visual                      | No hay cambio visual   | Se declara explícitamente "sin captura": ningún cambio toca UI                                     |
