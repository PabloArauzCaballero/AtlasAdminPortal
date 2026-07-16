import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  // Desmonta el árbol de React entre tests para que no se filtre estado/DOM.
  cleanup();
  // Las variables de entorno se stubean por test (política de storage de sesión).
  vi.unstubAllEnvs();
});
