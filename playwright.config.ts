import { defineConfig, devices } from "@playwright/test";

// Puerto configurable por `E2E_PORT`. En Windows, Hyper-V/WSL reservan rangos
// dinámicos (`netsh interface ipv4 show excludedportrange protocol=tcp`) y el
// 5273 puede caer dentro: `next start` falla con EACCES aunque netstat muestre
// el puerto libre. Elegir un puerto que el CORS del backend ya permita (3000).
const PORT = Number(process.env.E2E_PORT ?? 5273);
const BASE_URL = `http://127.0.0.1:${PORT}`;

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
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `${BASE_URL}/internal/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
