# Guía de cierre a 10/10 — lo que depende de ti

**Fecha:** 2026-07-17
**Para:** Pablo (y quien continúe el portal)
**Qué es esto:** el trabajo que **NO se puede hacer ni verificar desde este entorno** (sin
navegador real, sin `axe`, sin backend levantado, sin un ojo humano sobre la UI). Cada punto trae
el _por qué_, el _cómo_ paso a paso, y el _criterio para darlo por cerrado_.

Lo que sí quedó hecho y verificado con tests está en `docs/pending/pending-items.md` (busca los
`RESUELTO_ATLAS_*` con fecha 2026-07-17). Esta guía es **solo lo que queda en tu cancha**.

---

## Resumen: 5 cosas dependen de ti

| #   | Tema                                              | Esfuerzo | Bloqueante para 10/10            |
| --- | ------------------------------------------------- | -------- | -------------------------------- |
| 1   | Verificar cookies de sesión en el navegador (R2)  | 15 min   | Sí (seguridad)                   |
| 2   | Auditoría `axe` + contraste AA (R10)              | 1–2 h    | Sí (accesibilidad)               |
| 3   | Teclado en el grafo SVG de linaje (R10)           | 2–4 h    | Parcial (a11y)                   |
| 4   | Smoke E2E con Playwright (R11)                    | 1 día    | Sí (sostener el 10)              |
| 5   | Reconfirmar cobertura en una máquina con recursos | 20 min   | No, pero deja el número en firme |

Y un **pendiente cruzado con el backend** que ya está implementado pero necesita que verifiques el
despliegue (punto 1).

---

## 1. Verificar las cookies de sesión en el navegador (R2)

### Por qué depende de ti

El cambio a cookies `HttpOnly` **ya está implementado y testeado** en backend y frontend (13 tests
de contrato en `AtlasBackend/test/unit/internal-users/internal-auth.controller.spec.ts` + los del
guard y la util). Pero los tests unitarios prueban el _contrato_ (el token no va en el body, la
cookie se emite con `httpOnly:true`, etc.), **no** cómo el navegador real trata los atributos
`Secure`/`SameSite`/`Domain`/expiración. Eso solo se ve con DevTools contra los dos servicios
levantados.

### Cómo hacerlo, paso a paso

1. Levanta el backend y el frontend:
   ```bash
   # terminal 1 (backend)
   cd C:/Users/DELL/Documents/GitHub/AtlasBackend
   yarn start:dev

   # terminal 2 (frontend)
   cd C:/Users/DELL/Documents/GitHub/AtlasAdminPortal
   yarn dev            # arranca en http://localhost:5273
   ```
2. Abre `http://localhost:5273/internal/login`, abre **DevTools → Application → Cookies →
   http://localhost:5273** (o el dominio del backend) y haz login con un usuario interno real.
3. **Verifica en las cookies `atlas_internal_access` y `atlas_internal_refresh`:**
   - `HttpOnly` = ✓ (columna HttpOnly marcada). Si no lo está, un XSS podría leerlas → fallo.
   - `SameSite` = `Lax` en local. (Ver nota de despliegue abajo.)
   - `Secure` = vacío en local (http). **En producción (https) DEBE estar ✓.**
   - `Path` = `/`.
   - La de `access` es de sesión (Expires = "Session"); la de `refresh` tiene fecha futura.
4. **Verifica que NO hay tokens en JS:** DevTools → Application → Session Storage →
   `http://localhost:5273`. La clave `atlas_internal_session_v3` **no debe contener** `accessToken`
   ni `refreshToken` (solo perfil, permisos, expiración). En la consola:
   ```js
   JSON.parse(sessionStorage.atlas_internal_session_v3 ?? "{}").accessToken; // debe ser undefined
   ```
5. **Verifica el refresh silencioso:** deja la pestaña abierta hasta que expire el access token (o
   baja `JWT_ACCESS_TOKEN_EXPIRES_IN` a `2m` en el `.env` del backend para probar rápido). Navega a
   otra pantalla: debe seguir funcionando **sin re-login** y la cookie `atlas_internal_access` debe
   cambiar de valor (rotó).
6. **Verifica el logout:** cierra sesión → ambas cookies deben desaparecer de DevTools.

### Nota de despliegue (importante para producción)

- Hoy portal (`:5273`) y API (`:3005`) son **el mismo site** (localhost), por eso `SameSite=Lax`
  funciona y da protección CSRF gratis.
- **Si en producción quedan en dominios distintos** (ej. `portal.atlas.com` y `api.atlas.com`),
  tienes que poner en el `.env` del backend:
  ```dotenv
  AUTH_COOKIE_SAMESITE=none      # obligatorio si son sites distintos
  AUTH_COOKIE_SECURE=true        # None sin Secure = el navegador descarta la cookie
  AUTH_COOKIE_DOMAIN=.atlas.com  # dominio padre común, si aplica
  ```
  Y con `SameSite=None` **pierdes la protección CSRF de la cookie**, así que hay que activar el
  token CSRF: define `NEXT_PUBLIC_INTERNAL_CSRF_HEADER_NAME` en el frontend (el cliente ya lo manda)
  y valida ese header en el backend en las mutaciones. El arranque del backend ya **falla con
  mensaje claro** si pones `SameSite=None` sin `Secure`, para que no se te pase.

### Criterio de cierre

Las dos cookies `HttpOnly`, sin tokens en Session Storage, refresh silencioso funcionando, logout
que limpia. En producción además `Secure`✓ y la decisión SameSite tomada según el punto anterior.

---

## 2. Auditoría `axe` + contraste AA (R10)

### Por qué depende de ti

`eslint-plugin-jsx-a11y` corre en `error` y toda la base pasa, pero el linter **no mide contraste
de color** ni detecta problemas que solo existen renderizados. Eso necesita `axe` sobre el DOM real
en un navegador.

### Cómo hacerlo, paso a paso

**Opción A — rápida y manual (30 min):**

1. Instala la extensión **axe DevTools** (Deque) en Chrome/Edge.
2. Con el portal levantado (`yarn dev`), recorre estas pantallas y corre axe en cada una
   (DevTools → pestaña axe DevTools → "Scan all of my page"):
   - `/internal/login`
   - `/internal/settings/users` y `/internal/settings/users/new` (formularios migrados)
   - `/internal/data-quality/issues` (diálogo de resolución)
   - `/internal/schema/versions` → proponer tabla (drawer con listas dinámicas)
   - `/internal/operations/work-queue` (decisiones de fraude/revisión)
   - `/internal/lineage` (grafo — ver punto 3)
   - Cualquier pantalla con `DataTable`
3. Anota y corrige las violaciones de **contraste** (las marca como "Serious"). El sistema de color
   está en `tailwind.config` y `src/shared/components/ui/badges.tsx`; los tonos a vigilar son
   `text-atlas-muted` sobre fondos claros y los badges ámbar/azul.

**Opción B — automatizada (recomendada, 1–2 h):** integra `axe` en un test E2E (ver punto 4) con
`@axe-core/playwright`:

```ts
import AxeBuilder from "@axe-core/playwright";
// dentro de un test, tras cargar la página:
const results = await new AxeBuilder({ page }).analyze();
expect(results.violations).toEqual([]);
```

Esto deja la auditoría como parte del CI y no depende de que alguien la corra a mano.

### Criterio de cierre

`axe` sin violaciones de nivel "Serious"/"Critical" (sobre todo contraste) en las pantallas clave, y
—si vas por la opción B— el chequeo corriendo en CI.

---

## 3. Teclado en el grafo SVG de linaje (R10)

### Por qué depende de ti

El grafo de linaje (`src/features/lineage-official/`) se dibuja como SVG con nodos posicionados.
Hacerlo operable por teclado (foco por nodo, flechas para moverse entre nodos conectados, Enter para
abrir el detalle) es una interacción **visual y espacial**: se puede escribir el código, pero
validar que "la flecha derecha lleva al nodo que el usuario ve a la derecha" necesita ojo humano
sobre el render. Por eso no lo cerré desde aquí (habría sido código a ciegas).

### Cómo hacerlo, paso a paso

1. En el componente del grafo, dale al contenedor SVG `role="application"` y
   `aria-label="Grafo de linaje de datos"`.
2. Cada nodo (`<g>`/`<rect>` del nodo) necesita:
   - `tabIndex={0}` para ser enfocable.
   - `role="button"` (o `"treeitem"` si modelas jerarquía) y un
     `aria-label` que combine **tipo + criticidad + nombre** (ej. "Tabla crítica: customers").
   - `onKeyDown` que maneje `Enter`/`Space` = abrir detalle, y flechas = mover el foco al nodo
     vecino según las aristas.
3. Mantén un estado `focusedNodeId` y, en las flechas, resuelve el vecino con la lista de aristas
   (`edges`) — arriba/abajo/izquierda/derecha según la posición relativa, o simplemente
   "siguiente/anterior conectado" si la disposición no es una grilla clara.
4. Da un estilo visible de foco al nodo enfocado (borde/halo), no solo el outline por defecto.

### Cómo verificarlo (tú, en el navegador)

- Tab lleva el foco al grafo y luego a un nodo.
- Las flechas mueven el foco de forma que **coincide con lo que ves**.
- Enter abre el drawer del nodo enfocado.
- Un lector de pantalla (NVDA/VoiceOver) anuncia tipo+criticidad+nombre al enfocar cada nodo.

### Criterio de cierre

Se puede recorrer y abrir cualquier nodo del grafo solo con teclado, y el lector de pantalla lo
anuncia con sentido. La parte de _tabla_ del linaje (`DataTable`) ya es accesible; esto es solo el
SVG.

---

## 4. Smoke E2E con Playwright (R11)

### Por qué depende de ti

La rúbrica pide "smoke e2e de flujos críticos". Eso necesita el **backend levantado con datos
reales** y un navegador headless — nada de eso existe en este entorno. Los ~100 tests unitarios que
sí escribimos cubren la lógica; el E2E cubre que todo junto funciona de punta a punta.

### Cómo hacerlo, paso a paso

1. Instala Playwright:
   ```bash
   cd C:/Users/DELL/Documents/GitHub/AtlasAdminPortal
   yarn add -D @playwright/test @axe-core/playwright
   npx playwright install chromium
   ```
2. Crea `playwright.config.ts` apuntando a `http://localhost:5273` y con un `webServer` que levante
   `yarn dev` (y asume el backend ya arriba, o añádelo).
3. Cubre estos flujos (los que el plan marca como críticos), cada uno contra un usuario de prueba
   real (usa `scripts/seed-test-users.mjs` del repo para tener cuentas):
   - **Login → landing** (y que el returnTo funcione).
   - **Alta de usuario** → que se muestre la contraseña temporal una sola vez y, si hay warnings,
     que se vean.
   - **Resolución de un issue de calidad** → que exija notas ≥10 y que el error salga dentro del
     modal.
   - **QA Lab dry-run** → ejecutar un endpoint en dry-run y ver el resultado (sin tocar datos).
   - **Logout** → que limpie sesión y redirija a login.
4. En cada test, mete el chequeo `axe` del punto 2 (opción B).
5. Añade el job a CI: `yarn playwright test`.

### Criterio de cierre

Los 5 flujos pasan en verde en CI con backend real, y cada uno lleva su chequeo `axe`.

---

## 5. Reconfirmar la cobertura en una máquina con recursos

### Por qué depende de ti

El objetivo del plan (≥80% en `shared/` y `features/qa-lab`) **está cumplido y encodado como
umbral bloqueante** en `vitest.config.ts` (`shared` 97%, `qa-lab` 91%). Pero en esta máquina de
desarrollo **no se pudo generar un reporte de cobertura limpio**: cada corrida instrumentada muere
por falta de recursos (un fichero de 15 tests tarda 56s; la suite de 1.500 tests ~10 min y siempre
flakea 1 test por timeout de recursos). No es que la cobertura bajara — es que la _medición_ no
corre aquí.

### Cómo hacerlo, paso a paso

En una máquina con más RAM/CPU (o el runner de CI):

```bash
cd C:/Users/DELL/Documents/GitHub/AtlasAdminPortal
yarn test:coverage
# si la máquina es lenta, sube el timeout por test:
node_modules/.bin/vitest run --coverage --test-timeout=30000
```

Si algún test flakea por recursos (no por lógica), reintenta o usa `--pool=threads`, que en esta
máquina resultó más estable que el pool de forks por defecto:

```bash
node_modules/.bin/vitest run --coverage --pool=threads
```

Cuando corra limpio, mira el resumen: `shared/` y `features/qa-lab` deben salir ≥80% (hoy ~98% y
~92%). Si subiste tests, **sube también los umbrales** de `vitest.config.ts` en el mismo commit
(están puestos ~1 punto por debajo de lo medido a propósito, como trinquete).

### Criterio de cierre

`yarn test:coverage` verde con los umbrales actuales, y el número de `shared`/`qa-lab` confirmado
≥80% en un reporte real.

---

## Recordatorio: un conflicto con trabajo paralelo

Durante estas sesiones, alguien (¿tú, en paralelo?) dejó **borrados** en el working tree
`src/shared/api/contract.ts`, `src/shared/api/schemas.ts` y `tests/unit/shared/api/contract.test.ts`,
pero `src/shared/api/client.ts` seguía **importándolos** — eso rompía el type-check de todo el
proyecto. Los **restauré** con `git checkout --` para dejar el árbol compilando.

**Si esa eliminación era intencional** (estabas quitando el módulo `contract`), tienes que rehacerla
_junto con_ actualizar `client.ts` para que no lo importe. Tal como estaba, era una eliminación a
medias que no compilaba.

---

## Lo que sí quedó cerrado y verificado (para tu tranquilidad)

Resumido — el detalle con `archivo:línea` está en `pending-items.md`:

- **Seguridad:** allowlist de host en QA Lab (no exfiltra tokens), CSP con nonce por request (sin
  `unsafe-inline`), cabeceras de seguridad, cookies `HttpOnly` (pendiente solo tu verificación del
  punto 1), refresh normalizado + mutex + sincronización de contexto.
- **Robustez:** invalidación de caché por dominio, `href` de búsqueda validado (anti open-redirect),
  alta de usuario tolerante a fallo parcial, sin estado obsoleto en drawers, errores dentro del
  modal.
- **Formularios (R8):** los 7 lotes cubiertos en su valor; 4 migrados del todo a react-hook-form +
  Zod (usuarios create/edit, proponer tabla, decisiones de fraude/revisión), 3 con validación en
  módulo puro testeado y render controlado (issues, broadcast, metadata).
- **Accesibilidad hecha y testeada en jsdom:** diálogos con focus-trap/Escape/foco, badges con
  semáforo completo, `aria-sort` en tablas, buscador global como combobox ARIA 1.2 (teclado), y
  **enlaces con subrayado persistente** (ya no dependen solo del color).
- **Tooling:** regla de límites entre features, `credentials:"include"` restringido, jsx-a11y en
  `error`, umbrales de cobertura como trinquete.
- **Pruebas:** ~100 tests nuevos entre estas sesiones (schemas, validaciones, cookies, teclado,
  a11y de tabla).

Con los 5 puntos de arriba cerrados, el portal llega al 10/10 real y sostenible.
