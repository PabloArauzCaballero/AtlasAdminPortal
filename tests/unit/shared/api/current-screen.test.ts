import { describe, expect, it, beforeEach } from "vitest";
import {
  getCurrentScreen,
  setCurrentScreen,
} from "@/shared/api/current-screen";

/**
 * Lo que este módulo pone en `x-atlas-flow` acaba en `system_action_logs` y decide si una pantalla
 * del catálogo pasa a VERIFIED. Una plantilla mal formada no da error: identifica una pantalla
 * equivocada, o ninguna, y el panel diría «nadie ha usado esta pantalla» sobre una que sí se usa.
 */
describe("setCurrentScreen", () => {
  beforeEach(() => setCurrentScreen(null));

  it("guarda una plantilla válida y la devuelve", () => {
    setCurrentScreen("/internal/flows");
    expect(getCurrentScreen()).toBe("/internal/flows");
  });

  it("descarta lo que no cumple el formato en vez de mandarlo y que el backend lo tire", () => {
    setCurrentScreen("javascript:alert(1)");
    expect(getCurrentScreen()).toBeNull();
    setCurrentScreen("sin-barra-inicial");
    expect(getCurrentScreen()).toBeNull();
  });

  it("null limpia la pantalla: al desmontar no debe quedar un origen de la anterior", () => {
    setCurrentScreen("/internal/flows");
    setCurrentScreen(null);
    expect(getCurrentScreen()).toBeNull();
  });
});
