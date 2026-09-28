import { describe, expect, it } from "vitest";
import {
  accionesPermitidas,
  permisoAccion,
  type AccionCaso,
} from "@/features/support/case-rules";

/**
 * La copia en pantalla de la máquina de estados del servidor (`SUPPORT_CASE_TRANSITIONS`).
 *
 * Lo que se fija es que ningún botón quede encendido donde el servidor respondería «no se puede
 * desde este estado», y que el que se apaga diga por qué.
 */
const ESTADOS = [
  "NEW",
  "TRIAGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "WAITING_INTERNAL",
  "WAITING_PARTNER",
  "ESCALATED",
  "ON_HOLD",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "DUPLICATE",
  "CANCELLED",
] as const;

function permitidos(accion: AccionCaso): string[] {
  return ESTADOS.filter((estado) => permisoAccion(accion, estado).permitida);
}

describe("accionesPermitidas", () => {
  it("resolver sólo desde los estados que llegan a «Resuelto»", () => {
    expect(permitidos("resolver")).toEqual([
      "IN_PROGRESS",
      "WAITING_CUSTOMER",
      "WAITING_INTERNAL",
      "WAITING_PARTNER",
      "ESCALATED",
    ]);
  });

  it("cerrar sólo con resolución documentada o como duplicado", () => {
    expect(permitidos("cerrar")).toEqual(["RESOLVED", "DUPLICATE"]);
  });

  it("escalar sigue la tabla: nunca desde un caso resuelto o terminado", () => {
    const si = permitidos("escalar");
    expect(si).toContain("NEW");
    expect(si).toContain("ON_HOLD");
    expect(si).toContain("REOPENED");
    for (const estado of ["RESOLVED", "CLOSED", "DUPLICATE", "CANCELLED"])
      expect(si).not.toContain(estado);
  });

  /** Transferir devuelve el caso a «Clasificado»: el servidor sólo lo admite desde aquí. */
  it("transferir sólo desde nuevo, clasificado, asignado o reabierto", () => {
    expect(permitidos("transferir")).toEqual([
      "NEW",
      "TRIAGED",
      "ASSIGNED",
      "REOPENED",
    ]);
  });

  it("un caso asignado explica cómo llegar a resolver sin mentir", () => {
    const permiso = accionesPermitidas("ASSIGNED").resolver;
    expect(permiso.permitida).toBe(false);
    if (!permiso.permitida)
      expect(permiso.motivo).toMatch(/responde al cliente/);
  });

  it("toda acción apagada lleva su motivo", () => {
    for (const estado of ESTADOS) {
      for (const permiso of Object.values(accionesPermitidas(estado))) {
        if (!permiso.permitida)
          expect(permiso.motivo.length).toBeGreaterThan(10);
      }
    }
  });

  it("un estado desconocido no habilita nada", () => {
    const todo = accionesPermitidas("ALGO_NUEVO");
    expect(Object.values(todo).every((p) => !p.permitida)).toBe(true);
  });
});
