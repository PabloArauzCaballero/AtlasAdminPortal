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
      // Sin thresholds todavía: la cobertura arranca cerca de cero y se sube
      // por fases (meta inicial 70%). Ponerlos ahora dejaría el CI en rojo.
    },
  },
});
