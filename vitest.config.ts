import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mismo alias que tsconfig.json ("@/*" -> "./src/*").
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    // Sin globals: cada test importa describe/it/expect explícitamente.
    // Evita depender de tipos globales y mantiene contento a ESLint.
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts"],
      /**
       * Umbrales de trinquete, no objetivos.
       *
       * Están fijados ~1 punto por debajo de la cobertura real medida
       * (2026-07-17) con un único propósito: que no BAJE. Poner aquí el 80%
       * que pide el plan dejaría el CI en rojo permanentemente, y un umbral
       * que siempre falla se acaba ignorando o borrando, que es peor que no
       * tenerlo.
       *
       * Al subir cobertura, sube también estos números en el mismo PR.
       * Objetivo declarado: 80% en `shared/` y `features/qa-lab`.
       *
       * OJO con los globs: en Vitest, un archivo que matchea un glob queda
       * **excluido** del umbral global. Por eso el `lines` de abajo cubre solo
       * lo que no cae en ninguno de los globs; no es la cobertura del proyecto.
       * Los números de referencia medidos hoy son:
       *   global 10.7% · shared 38.8% · qa-lab 18.0% · runtime-jobs 36.1%
       *   qa-console 14.2% · operations-sessions 16.0% · qa-stress 9.3%
       *   operations 2.3%
       *
       * `src/features/operations/**` no tiene trinquete propio a propósito: el
       * flujo de versionado de catálogo es sobre todo formulario sin probar
       * (2.3%), y un umbral ahí solo serviría para congelar ese número. La
       * lógica que sí decide algo (máquina de estados de aprobación) está
       * cubierta por `catalog-version-lifecycle.test.ts`.
       */
      thresholds: {
        lines: 10,
        "src/shared/**": { lines: 38 },
        "src/features/qa-lab/**": { lines: 17 },
        "src/features/runtime-jobs/**": { lines: 35 },
        "src/features/qa-console/**": { lines: 13 },
        "src/features/operations-sessions/**": { lines: 15 },
      },
    },
  },
});
