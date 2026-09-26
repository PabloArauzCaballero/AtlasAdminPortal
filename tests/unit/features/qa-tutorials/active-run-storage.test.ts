import { afterEach, describe, expect, it } from "vitest";
import {
  readActiveRun,
  writeActiveRun,
} from "@/features/qa-tutorials/progress-storage";

/**
 * La corrida activa (qué tutorial y qué paso está abierto) vive en
 * sessionStorage para sobrevivir a un F5 y al remontaje del árbol. Un valor
 * corrupto no puede tumbar el provider: se lee como «nada abierto».
 */
describe("corrida activa del tutorial", () => {
  afterEach(() => sessionStorage.clear());

  it("guarda, lee y borra la corrida", () => {
    expect(readActiveRun()).toBeNull();
    writeActiveRun({ tutorialId: "qa-lab-stress", stepIndex: 2 });
    expect(readActiveRun()).toEqual({
      tutorialId: "qa-lab-stress",
      stepIndex: 2,
    });
    writeActiveRun(null);
    expect(readActiveRun()).toBeNull();
  });

  it("tolera basura y valores incompletos", () => {
    sessionStorage.setItem("qa-tutorials-active-run", "{no es json");
    expect(readActiveRun()).toBeNull();
    sessionStorage.setItem("qa-tutorials-active-run", JSON.stringify({ x: 1 }));
    expect(readActiveRun()).toBeNull();
    sessionStorage.setItem(
      "qa-tutorials-active-run",
      JSON.stringify({ tutorialId: "t", stepIndex: "dos" }),
    );
    expect(readActiveRun()).toEqual({ tutorialId: "t", stepIndex: 0 });
  });
});
