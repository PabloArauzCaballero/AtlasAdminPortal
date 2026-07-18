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
    // El default de vitest (5s) es demasiado ajustado para la suite completa en
    // CI: con ~1500 tests y jsdom, el arranque de un test bajo carga supera los
    // 5s y falla por timeout sin que haya ningún bug (los mismos tests pasan
    // aislados). 20s da holgura sin esconder un test genuinamente colgado.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts"],
      /**
       * Umbrales de trinquete, no objetivos.
       *
       * Fijados ~1 punto por debajo de la cobertura real medida (2026-07-17)
       * con un único propósito: que no BAJE. Un umbral por encima de la
       * realidad deja el CI en rojo permanente, y un umbral que siempre falla
       * se acaba borrando — que es peor que no tenerlo.
       *
       * **Al subir cobertura, sube también estos números en el mismo PR.**
       *
       * El objetivo declarado del plan (80% en `shared/` y `features/qa-lab`)
       * está CUMPLIDO: shared 98.0%, qa-lab 92.5%. Los trinquetes de esas dos
       * áreas ya no son "de arranque": defienden un nivel real.
       *
       * OJO con los globs: en Vitest, un archivo que matchea un glob queda
       * **excluido** del umbral global. Por eso `lines` de abajo NO es la
       * cobertura del proyecto (30.8%), sino solo la del resto que no cae en
       * ningún glob. Medición por área:
       *   shared 98.0% · qa-lab 92.5% · runtime-jobs 36.1% · operations-sessions 16.0%
       *   qa-console 14.0% · qa-stress 9.1% · operations 2.3% · TOTAL 30.8%
       *
       * `src/features/operations/**` y `qa-stress/**` no tienen trinquete
       * propio a propósito: son sobre todo formularios sin probar, y un umbral
       * ahí solo congelaría ese número. La lógica que sí decide algo (máquina
       * de estados de aprobación, schema del perfil de stress) está cubierta
       * por sus tests dedicados.
       */
      thresholds: {
        lines: 10,
        "src/shared/**": { lines: 97 },
        "src/features/qa-lab/**": { lines: 91 },
        "src/features/runtime-jobs/**": { lines: 35 },
        "src/features/qa-console/**": { lines: 13 },
        "src/features/operations-sessions/**": { lines: 15 },
      },
    },
  },
});
