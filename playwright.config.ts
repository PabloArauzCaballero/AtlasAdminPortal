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

const PORT = 5273;
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
const BASE_URL = `http://localhost:${PORT}`;

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
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/internal.json",
      },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `${BASE_URL}/internal/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
