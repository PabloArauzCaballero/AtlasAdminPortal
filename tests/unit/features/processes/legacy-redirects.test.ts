import { describe, expect, it } from "vitest";
import {
  businessFlowsRedirect,
  processInstancesRedirect,
} from "@/features/processes/legacy-redirects";

/**
 * «Procesos ×3» se fusionó (2026-09-29): las rutas viejas siguen vivas como redirecciones, con sus
 * parámetros, para que ningún marcador ni enlace profundo acabe en un 404.
 */
describe("redirecciones de las rutas retiradas de Procesos", () => {
  it("/internal/flows/business sin parámetros lleva a la lista de Procesos", () => {
    expect(businessFlowsRedirect({})).toBe("/internal/procesos");
  });

  it("/internal/flows/business?flow=X conserva la ficha técnica del flujo en el mapa de rutas", () => {
    expect(businessFlowsRedirect({ flow: "flow_abc 1" })).toBe(
      "/internal/flows?flow=flow_abc%201",
    );
    expect(businessFlowsRedirect({ flow: ["flow_a", "flow_b"] })).toBe(
      "/internal/flows?flow=flow_a",
    );
  });

  it("/procesos/[code]/instancias lleva a la pestaña Casos en curso", () => {
    expect(processInstancesRedirect("account_signup_to_login", {})).toBe(
      "/internal/procesos/account_signup_to_login?tab=casos",
    );
  });

  it("y conserva el caso abierto (`?caso=`)", () => {
    expect(
      processInstancesRedirect("account_signup_to_login", { caso: "101" }),
    ).toBe("/internal/procesos/account_signup_to_login?tab=casos&caso=101");
  });
});
