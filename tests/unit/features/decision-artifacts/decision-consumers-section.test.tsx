import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DecisionArtifactBinding } from "@/features/decision-artifacts/types";

/**
 * El enlace «ver las ejecuciones en el motor» sale del portal, así que depende de una URL de
 * despliegue. Antes caía a `http://localhost:5173` cuando la variable faltaba: en producción era un
 * enlace a una pantalla que no existe, y hacía dudar de si el dato estaba mal. Ahora, sin
 * `NEXT_PUBLIC_DECISION_ENGINE_URL`, el enlace no se pinta — igual que en el resto de saltos al Motor
 * (`engine-links.ts`).
 */
const binding: DecisionArtifactBinding = {
  decisionType: "credit",
  artifactCode: "ATLAS_BNPL_UNDERWRITING",
  source: "database",
  consumerEndpoints: [
    {
      method: "POST",
      path: "/operations/credit/x",
      purpose: "Decide el crédito",
    },
  ],
  workflowStage: "Crédito",
  workflowSteps: ["El cliente pide crédito", "El Motor decide"],
};

async function montar() {
  vi.resetModules();
  const { DecisionConsumersSection } =
    await import("@/features/decision-artifacts/decision-consumers-section");
  return render(<DecisionConsumersSection binding={binding} />);
}

describe("DecisionConsumersSection · enlace al Motor", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sin la URL del Motor configurada no pinta el enlace (y nunca apunta a localhost)", async () => {
    vi.stubEnv("NEXT_PUBLIC_DECISION_ENGINE_URL", "");
    await montar();
    expect(
      screen.queryByRole("link", { name: /ejecuciones de esta política/i }),
    ).toBeNull();
    for (const enlace of screen.queryAllByRole("link")) {
      expect(enlace.getAttribute("href") ?? "").not.toContain("localhost:5173");
    }
  });

  it("con la URL configurada enlaza a /executions del Motor, sin barras dobles", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_DECISION_ENGINE_URL",
      "https://motor.ejemplo.test/",
    );
    await montar();
    const enlace = screen.getByRole("link", {
      name: /ejecuciones de esta política/i,
    });
    expect(enlace.getAttribute("href")).toBe(
      "https://motor.ejemplo.test/executions",
    );
  });
});
