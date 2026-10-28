> **AVANCE: 16 / 16 — 100,0 %.** Mide las microtareas del plan, no la cobertura de la auditoría: AUD-06, AUD-07, AUD-09, AUD-10 y AUD-11 siguen abiertos.

# Reporte — Auditoría de seguridad con mapeo COBIT 5 · AtlasAdminPortal (portal y auth broker)

- Fecha: 2026-10-28 · Plan: [PLAN.md](./PLAN.md) · Rama: `claude/gallant-thompson-wp8f28` · Commit de código: `5428af1` (local, sin push al escribir este reporte)
- Peldaño de evidencia alcanzado: **TESTED**. No VERIFIED: no se ejecutó el portal desplegado, ni Docker, ni Playwright.
- Aclaración: COBIT 5 es un marco de gobierno de TI, no una norma de código. Este reporte entrega el mapeo hallazgo → proceso COBIT 5 y la evidencia técnica; **no es una certificación ni una evaluación de capacidad**.
- Nota de procedencia: el agente auditor no pudo escribir este archivo (la herramienta de escritura se lo rechazó para subagentes y no lo eludió). Lo redactó la sesión coordinadora a partir de su informe y de `evidencia/`. No se re-ejecutó ningún gate al redactarlo.

## Completado

| ID | Qué se logró | Verificación | Resultado |
|---|---|---|---|
| H1.S1.M1–M6 | Revisión por lectura: sesión/tokens/CSP/middleware, proxies, imágenes de identidad, broker, Dockerfile/CI/secretos, dependencias | lectura, `grep`, `yarn audit --json` | HECHO (lectura; no es verificación de comportamiento). `evidencia/audit-*-antes.txt` |
| H2.S1.M1 | AUD-01: `next` 15.5.27 → 15.5.28 | `yarn audit` ya no lista `next` | PASS, `evidencia/audit-portal-despues.txt` |
| H2.S1.M2 | AUD-02: `zod` → 4.6.7 en portal y broker | `yarn audit` ya no lista `zod` | PASS |
| H2.S2.M1 | AUD-03: `AUTH_BROKER_STRICT_TRANSPORT` pasa a aplicarse; el endpoint de token por `http://` ya no envía `client_secret` en claro | test del broker | PASS, `evidencia/broker-test-transport-verde.txt` |
| H2.S2.M2 | AUD-04: `redirect: 'error'` en las tres llamadas salientes con credenciales o claves | tests del broker | PASS |
| H2.S2.M3 | Smoke e2e local del broker ajustado a la variable de escape documentada | `smoke:e2e` | exit 0 |
| H2.S3.M1 | AUD-05: `redactedHeaders` ya no revela fragmentos de cabeceras sensibles | test unitario nuevo | PASS, `evidencia/portal-test-redaccion-verde.txt` |
| H3.S1.M1 | Portal: type-check, lint, test, source-boundaries, max-lines, format:check | `gates-portal.txt` | exit 0 |
| H3.S1.M2 | Broker: format:check, lint, typecheck, test, build, smoke:e2e | `gates-broker.txt` | exit 0 |
| H4.S1.M1 | Este reporte | archivo en disco | existe |
| H4.S1.M2 | Commit local con atribución, sin push | `git show --stat HEAD` | `5428af1` |

Pruebas nuevas en rojo sin el arreglo: broker, 4 fallos de comportamiento al revertir `src/infrastructure` (y la suite no compila sin la API nueva); portal, 3 fallos (`evidencia/broker-test-rojo-sin-fix.txt`, `portal-test-redaccion-rojo.txt`).

## A medias

Ninguna.

## Pendiente

| ID | Estado | Qué lo destraba |
|---|---|---|
| AUD-06 | NO CORREGIDO | devDependencies con 5 altas (`vitest`>`vite`>`launch-editor`, `jsdom`>`undici`, `tailwind`>`postcss-selector-parser`) y una baja sin parche (`deepmerge`). Solo herramientas de prueba, no llegan a producción. Subir `vitest`/`jsdom` exige decisión. |
| AUD-07 | NO CORREGIDO | `src/app/api/qa-fakers/[...path]/route.ts` no exige sesión. Decisión documentada; exigirla rompe el modo bearer/Lab. |
| AUD-09 | NO CORREGIDO (recomendación) | `auth-session-policy.ts:14-18` acepta mode `session`/`auto` también en producción; restringirlo puede romper backends bearer. |
| AUD-10 | BLOCKED | Flags de cookie (HttpOnly/Secure/SameSite), CSRF de servidor y rate limit viven en AtlasBackend. |
| AUD-11 | ROTAR (acción humana) | Credencial en el historial git de `.env.example` líneas 13-14 (gitleaks `atlas-env-plaintext-credential`). Ya conocida en `docs/audits/baseline-2026-07-15.md`. El valor no se leyó ni se reprodujo. |

## Hallazgos y mapeo COBIT 5

| ID | Sev. | Archivo:línea (original) | CWE / OWASP | COBIT 5 | Estado |
|---|---|---|---|---|---|
| AUD-01 | Crítica | `package.json:36` `next` 15.5.27 (RCE sin autenticación en el optimizador de imágenes, GHSA-2464-fhr4-w9xw; DoS de Server Actions) | CWE-94/400, A06 | DSS05.01, BAI06, APO12 | CORREGIDO `5428af1` (15.5.28) |
| AUD-02 | Alta | `package.json:42`, `broker/package.json:33` `zod` < 4.6.6 (DoS de memoria) | CWE-770, A06 | DSS05.01, BAI06 | CORREGIDO (4.6.7) |
| AUD-03 | Media | broker `atlas-provider-catalog.ts:41`, `auth-broker.config.ts:97`: STRICT_TRANSPORT declarada y no aplicada | CWE-319, A02 | DSS05.02, DSS05.04, APO13.01, MEA02 | CORREGIDO |
| AUD-04 | Baja | broker `token-endpoint.client.ts:132`, `authorization-code.client.ts:65`, `id-token.verifier.ts:213`: seguían redirecciones con credenciales/JWKS | CWE-601/522, A05 | DSS05.02, DSS05.04 | CORREGIDO |
| AUD-05 | Baja | `src/features/qa-lab/qa-safety.ts:178-181` dejaba 4+4 caracteres de cabeceras sensibles | CWE-532/200, A09 | DSS05.07, DSS05.06 | CORREGIDO |
| AUD-06 | Media | devDependencies (ver Pendiente) | CWE-1104, A06 | DSS05.01, APO12, MEA01 | NO CORREGIDO |
| AUD-07 | Baja | `qa-fakers` sin sesión | CWE-306, A01 | DSS05.04, DSS06 | NO CORREGIDO |
| AUD-08 | Info | rutas protegidas solo en cliente; el middleware solo emite CSP | CWE-602 | DSS05.04 | ACEPTADO (la autoridad es la API, regla 95.6.1) |
| AUD-09 | Info | modo de sesión permisivo en producción | CWE-922 | DSS05.04, APO13.02 | NO CORREGIDO |
| AUD-10 | Info | cookies, CSRF de servidor, rate limit | CWE-352 | DSS05.04, DSS05.07 | BLOCKED |
| AUD-11 | ROTAR | historial de `.env.example` | CWE-798 | DSS05.04, APO13.03 | PENDIENTE de rotación humana |

Descartados tras leer el código: XSS (0 `dangerouslySetInnerHTML`), open redirect (`returnTo`/`readSafeHref`), tokens en storage (modo cookie), CSP/headers, SSRF (`/almacen/subida` con lista exacta y redirect manual; rewrites fijos), imágenes de identidad (blob autenticado, nunca URL pública), Dockerfiles (no root, digest, `.env` fuera), CI y broker (tiempo constante, PKCE S256, nonce, lista de algoritmos, logger con redacción).

## Evidencia

Todo en `evidencia/` (salida literal): `audit-portal-antes/despues/prod-despues.txt`, `audit-broker-antes/despues/prod-despues.txt`, `base-test.txt`, `base-typecheck.txt`, `build-portal.txt`, `gates-portal.txt`, `gates-broker.txt`, `test-portal-despues.txt`, `broker-test-rojo-sin-fix.txt`, `broker-test-transport-verde.txt`, `portal-test-redaccion-rojo.txt`, `portal-test-redaccion-verde.txt`.

Resumen informado por el agente (no re-ejecutado al redactar este reporte):
- Portal: `max-lines`, `source-boundaries`, `field-help`, `type-check`, `lint`, `format:check` y `yarn build` (Next 15.5.28) con exit 0. `yarn test`: base 351 archivos / 3299 pruebas; después 352 / 3302, todo verde.
- Broker: `format:check`, `lint`, `typecheck`, `test` (8 suites / 105), `build` y `smoke:e2e` con exit 0.
- `yarn audit --groups dependencies`: 0 vulnerabilidades de producción en portal y broker (antes: 1 crítica y 7 altas en el portal; 1 alta en el broker).
- Se instaló con `--ignore-engines` (Node 22.22.0 frente a ≥ 22.22.2).

## No cubierto

- Cookies, CSRF, rate limit y autorización de AtlasBackend.
- Ejecución del portal desplegado, imagen Docker y Playwright. Sin capturas: ningún cambio toca la interfaz.
- No se reprodujo el exploit de AUD-01: la corrección se basa en el aviso público y en la versión parcheada.
- No se revisaron línea a línea los ~350 archivos de features; se revisó por patrón y a mano lo señalado.
- No hay verificación de que `next` 15.5.28 funcione en navegador con el portal.

## Desvíos del plan

- H4.S1.M1 (este reporte) no lo escribió el agente por rechazo de la herramienta; lo escribió la sesión coordinadora.

## Riesgos residuales

- `/_next/image` sigue activo (el agente sugiere `images.unoptimized`).
- Sin COOP.
- El broker no tiene rate limit propio y su almacén OIDC está en memoria (una sola réplica).
- Avisos altos en devDependencies (AUD-06).

## Decisiones y ambigüedades

- Secreto a rotar: la credencial del historial de `.env.example` (AUD-11). Borrar el archivo no limpia el historial.
- Confirmar con quien opere AtlasBackend los flags de cookie y el rate limit (AUD-10).
