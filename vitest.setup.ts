import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/*
 * `findBy*` y `waitFor` esperan 1 s por defecto. Con dos suites completas en paralelo en la misma
 * máquina (varias sesiones sobre el mismo Mac), la ficha del préstamo tardó 1,58 s en pintar su
 * cabecera y la prueba cayó sin ningún fallo en la pantalla (medido el 2026-09-28; sola pasa 5/5).
 * 5 s sigue muy por debajo del `testTimeout` de 20 s y deja de confundir lentitud con un bug.
 */
configure({ asyncUtilTimeout: 5_000 });

/*
 * El QA Lab falla cerrado: sin un ambiente de pruebas declarado queda en sólo lectura (ver
 * `defaultQaEnvironment`). Las pruebas corren, por definición, en uno; la que quiera otro lo pone
 * con `vi.stubEnv` y `unstubAllEnvs` la devuelve a éste.
 */
process.env.NEXT_PUBLIC_ATLAS_ENVIRONMENT ??= "test";

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
