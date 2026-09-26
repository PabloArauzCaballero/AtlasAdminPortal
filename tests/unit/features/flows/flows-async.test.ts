import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
vi.mock("@/shared/api/client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

import {
  CONSUMER,
  DIAGNOSIS,
  DRIFT,
  fecha,
} from "@/features/flows/async/labels";
import { contarSinGuarda } from "@/features/flows/async/rbac-drift-page";
import { getPendingWork, getRbacDrift } from "@/features/flows/async/services";

beforeEach(() => {
  apiRequest.mockReset();
});

describe("servicios de trabajo pendiente y deriva", () => {
  it("pide el trabajo pendiente con la ventana elegida", async () => {
    apiRequest.mockResolvedValueOnce({});
    await getPendingWork(7);
    expect(apiRequest).toHaveBeenCalledWith("/systems/flows/pending-work", {
      query: { windowDays: 7 },
    });
  });

  it("pide la deriva de permisos", async () => {
    apiRequest.mockResolvedValueOnce({});
    await getRbacDrift();
    expect(apiRequest).toHaveBeenCalledWith("/systems/flows/rbac-drift");
  });
});

/**
 * El color es una afirmación. Lo que se protege: sólo va en rojo lo que el backend llama avería, y un
 * mensaje que nunca salió no se pinta como aviso.
 */
describe("etiquetas", () => {
  it("sólo las averías van en rojo", () => {
    const rojos = [
      ...Object.entries(CONSUMER),
      ...Object.entries(DIAGNOSIS),
      ...Object.entries(DRIFT),
    ]
      .filter(([, etiqueta]) => etiqueta.tone === "critical")
      .map(([codigo]) => codigo)
      .sort();
    expect(rojos).toEqual([
      "MENSAJE_SIN_SALIDA",
      "SALTADOS",
      "SIN_GUARDA",
      "SIN_REGISTRO",
    ]);
  });

  it("registrado sin avisos no es avería: puede ser un evento de auditoría", () => {
    expect(CONSUMER.REGISTRADO_SIN_AVISOS.tone).toBe("warning");
    expect(CONSUMER.SIN_PROCESAR.tone).toBe("muted");
  });

  it("sin fecha dice la palabra que corresponde, no una fecha inventada", () => {
    expect(fecha(null)).toBe("—");
    expect(fecha(null, "Nunca")).toBe("Nunca");
  });

  it("cuenta las llamadas sin guarda de todas las pantallas", () => {
    const llamada = (severity: "SIN_GUARDA" | "SOLO_ROL" | "PUBLIC") => ({
      flowId: `f-${Math.random()}`,
      method: "GET",
      path: "/x",
      severity,
      roles: [],
    });
    const data = {
      screensWithObservedEdges: 3,
      truncated: false,
      screens: [
        {
          clientCode: "ADMIN_PORTAL",
          route: "/a",
          navPermissions: ["p"],
          navRoles: [],
          calls: [llamada("SIN_GUARDA"), llamada("SOLO_ROL")],
        },
        {
          clientCode: "ADMIN_PORTAL",
          route: "/b",
          navPermissions: ["p"],
          navRoles: [],
          calls: [llamada("SIN_GUARDA"), llamada("PUBLIC")],
        },
      ],
    };
    expect(contarSinGuarda(data)).toBe(2);
    expect(contarSinGuarda(undefined)).toBe(0);
  });
});
