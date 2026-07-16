import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * Node 22 expone un `localStorage` experimental propio que queda en `undefined`
 * si no se arranca con `--localstorage-file`, y pisa al de jsdom (sessionStorage
 * sí sobrevive). Sin este polyfill, cualquier código que toque
 * window.localStorage revienta en los tests aunque funcione en un navegador real.
 */
function installLocalStoragePolyfill() {
  if (typeof window === "undefined" || window.localStorage) return;

  const store = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: memoryStorage,
  });
}

installLocalStoragePolyfill();

afterEach(() => {
  // Desmonta el árbol de React entre tests para que no se filtre estado/DOM.
  cleanup();
  // Las variables de entorno se stubean por test (política de storage de sesión).
  vi.unstubAllEnvs();
  // El storage no debe filtrarse de un test a otro.
  window.localStorage?.clear();
  window.sessionStorage?.clear();
});
