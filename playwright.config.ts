import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

/**
 * Las credenciales del E2E viven en `.env.local` (ignorado por git), igual que las de la app.
 *
 * Playwright corre en su propio proceso Node y NO carga los `.env*` de Next: `TEST_EMAIL` y
 * `TEST_PASSWORD` llegaban siempre vacías y la suite entera se SALTABA con el motivo «define
 * TEST_EMAIL…» aun teniéndolas puestas. Un E2E que se salta en silencio se lee en CI como un E2E
 * que pasa, que es el peor de los dos fallos posibles.
 */
loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });

/*
 * El puerto es configurable, y no por gusto: en esta máquina el 5273 lo sirve un CONTENEDOR con una
 * imagen ya construida del portal. `reuseExistingServer` lo daba por bueno y la suite medía código
 * de otra compilación — una pantalla recién cambiada salía como estaba antes, en verde, sin que
 * nada lo delatara. Es el peor fallo posible de un E2E: no falla, miente.
 *
 * Con `PW_PORT` se apunta a un servidor de desarrollo propio (`next dev -p 5274`) sin tocar el
 * contenedor de nadie. Es la misma salida que `AtlasDecisionEngineFrontend` ya tenía con
 * `PW_BASE_URL`.
 */
const PORT = Number(process.env.PW_PORT ?? 5273);
/**
 * `PW_BASE_URL` apunta la suite a un portal YA desplegado, con su URL completa.
 *
 * Es lo que permite comprobar la versión que de verdad está publicada —la del túnel del VPS— en
 * lugar de una compilación local que se le parece. Sin esto sólo se podía medir `localhost`, y un
 * despliegue roto pasaba desapercibido: el código estaba bien y el entorno no.
 */
const EXTERNAL_BASE_URL = process.env.PW_BASE_URL;
/**
 * `localhost` y no `127.0.0.1`, a propósito.
 *
 * La sesión del portal vive en cookies `HttpOnly` con `SameSite=Lax`, y el navegador decide
 * «same-site» por dominio registrable: `127.0.0.1` y `localhost` son sitios DISTINTOS. Con la app
 * servida en `127.0.0.1` y la API en `http://localhost:3005`, el login respondía 200 y ponía las
 * cookies, pero ninguna petición posterior las llevaba — la sesión moría en el primer 401 y el
 * portal rebotaba a `?reason=session_expired`, que es exactamente el síntoma de una sesión
 * caducada y no lo era. Debe coincidir con el host de `NEXT_PUBLIC_API_BASE_URL`.
 */
const BASE_URL = EXTERNAL_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * E2E con Playwright. El webServer levanta la app real (`next start`, que exige
 * un `next build` previo hecho en el job de CI) y espera a que /internal/login
 * responda antes de correr los tests.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Un proyecto de SETUP que autentica una vez y guarda el estado de sesión. Los demás dependen
    // de él y arrancan ya dentro del portal: el endpoint de login está limitado a 10 intentos por
    // minuto, así que una suite que se autentica en cada prueba se estrangula sola.
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      // Las especificaciones de evidencia NO entran aquí: no usan el estado de sesión y no deben
      // arrastrar el `setup`, que exige credenciales y backend.
      testIgnore: /\.evidencia\.spec\.ts$/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/internal.json",
      },
    },
    /*
     * EVIDENCIA: capturas de pantalla con el expediente doblado.
     *
     * Proyecto aparte y SIN dependencia del `setup`, que es lo único que las separa del resto. Las
     * demás pruebas miden el portal contra el stack real y por eso necesitan una sesión de verdad;
     * éstas miden que una PANTALLA enseñe lo que dice enseñar, y atarlas a un login las pondría
     * rojas cada vez que el backend no esté — por un motivo que no tiene nada que ver con lo que
     * comprueban.
     *
     * Se corren solas:  npx playwright test --project=evidencia
     */
    {
      name: "evidencia",
      testMatch: /\.evidencia\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Con `PW_PORT` se asume que el servidor lo levanta quien corre la suite (típicamente un
    // `next dev`), así que no se arranca ninguno: arrancar un `next start` sobre un puerto ya
    // ocupado sólo produciría un error confuso.
    // Con `PW_BASE_URL` el portal ya está servido en otra máquina: arrancar uno aquí no sólo
    // sobra, sino que mediría el equivocado.
    command:
      process.env.PW_PORT || EXTERNAL_BASE_URL
        ? "true"
        : `npx next start -p ${PORT}`,
    url: `${BASE_URL}/internal/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
