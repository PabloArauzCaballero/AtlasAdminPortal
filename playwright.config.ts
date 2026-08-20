import { defineConfig, devices } from "@playwright/test";

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
    command: "yarn start",
    url: `${BASE_URL}/internal/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
