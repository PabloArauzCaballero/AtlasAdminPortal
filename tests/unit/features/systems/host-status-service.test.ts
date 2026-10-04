import { describe, expect, it, vi } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";

// Un manejador simple y no `vi.fn`: vi.fn rastrea cada promesa rechazada que devuelve y vitest la
// da por «rechazo sin atender» aunque el servicio la capture.
const { cliente } = vi.hoisted(() => ({
  cliente: {
    llamadas: [] as string[],
    respuesta: (): Promise<unknown> => Promise.resolve(null),
  },
}));
vi.mock("@/shared/api/client", () => ({
  apiRequest: (path: string) => {
    cliente.llamadas.push(path);
    return cliente.respuesta();
  },
}));

import { getHostStatus } from "@/features/systems/services";

const errorHttp = (status: number) =>
  new AtlasApiError({ status, code: "X", message: "x", requestId: "r" });

describe("getHostStatus", () => {
  it("devuelve lo que contesta el backend", async () => {
    const reporte = { available: false as const };
    cliente.respuesta = () => Promise.resolve(reporte);
    await expect(getHostStatus()).resolves.toBe(reporte);
    expect(cliente.llamadas).toContain("/systems/monitor/host");
  });

  it("un backend sin la ruta (404) es «sin lectura», no un error", async () => {
    cliente.respuesta = () => Promise.reject(errorHttp(404));
    await expect(getHostStatus()).resolves.toEqual({ available: false });
  });

  it("cualquier otro fallo sigue siendo un error (403, 500, red)", async () => {
    cliente.respuesta = () => Promise.reject(errorHttp(403));
    await expect(getHostStatus()).rejects.toMatchObject({ status: 403 });
    cliente.respuesta = () => Promise.reject(errorHttp(500));
    await expect(getHostStatus()).rejects.toMatchObject({ status: 500 });
    cliente.respuesta = () => Promise.reject(new Error("red"));
    await expect(getHostStatus()).rejects.toThrow("red");
  });
});
