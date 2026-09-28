import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { mutacion } = vi.hoisted(() => ({
  mutacion: () => ({ mutate: () => {}, isPending: false, error: null }),
}));
vi.mock("@/features/support/hooks", () => ({
  useSupportQueues: () => ({ data: { queues: [] } }),
  useClaimCaseMutation: mutacion,
  useTransferCaseMutation: mutacion,
  useEscalateCaseMutation: mutacion,
  useInternalNoteMutation: mutacion,
  useCloseCaseMutation: mutacion,
}));

import { CaseActions } from "@/features/support/case-actions";
import {
  actor,
  ESTADOS_CASO,
  estadoCaso,
  evento,
  legible,
  prioridad,
  tipoCaso,
} from "@/features/support/labels";
import {
  causaRaizFiltroOptions,
  codeOptions,
} from "@/features/support/support-options";
import { EstadoCasoBadge } from "@/features/support/support-badges";
import { ESTADOS_ABIERTOS } from "@/features/support/queue-page";
import type { SupportCase } from "@/features/support/types";

/**
 * Lo que la mesa lee en vez de los códigos del servidor.
 *
 * La bandeja decía «WAITING_CUSTOMER», la historia «CASE_TRIAGED · AGENT» y el filtro de causa raíz
 * «Sin determinar (UNKNOWN)». Estas pruebas fijan que ningún código llegue crudo a la pantalla.
 */
describe("etiquetas de soporte", () => {
  it("los catorce estados tienen nombre en español", () => {
    expect(Object.keys(ESTADOS_CASO)).toHaveLength(14);
    for (const [codigo, { label }] of Object.entries(ESTADOS_CASO)) {
      expect(label).not.toBe(codigo);
      expect(label).not.toMatch(/_/);
    }
    render(<EstadoCasoBadge value="WAITING_CUSTOMER" />);
    expect(screen.getByText("Esperando al cliente")).toBeInTheDocument();
  });

  it("prioridades con nombre y tono distinto", () => {
    expect(prioridad("P1")).toEqual({
      label: "P1 · Crítica",
      tone: "critical",
    });
    expect(prioridad("P4").label).toBe("P4 · Baja");
    const tonos = new Set(
      ["P1", "P2", "P3", "P4"].map((p) => prioridad(p).tone),
    );
    expect(tonos.size).toBe(4);
  });

  it("un código desconocido se lee como texto, nunca crudo", () => {
    expect(legible("SOME_NEW_CODE")).toBe("Some new code");
    expect(evento("CASE_SOMETHING_ELSE")).toBe("Case something else");
    expect(estadoCaso("FOO_BAR").label).toBe("Foo bar");
    expect(tipoCaso("TECHNICAL_INCIDENT")).toBe("Falla técnica");
    expect(evento("CASE_TRIAGED")).toBe("Caso clasificado");
    expect(actor("CUSTOMER")).toBe("Cliente");
  });

  it("los códigos del catálogo se enseñan por su explicación", () => {
    const opciones = codeOptions([
      { code: "APPLICATION_DEFECT", label: "Defecto en el código de Atlas." },
    ]);
    expect(opciones[0]).toMatchObject({
      value: "APPLICATION_DEFECT",
      label: "Defecto en el código de Atlas",
    });
    const conNombre = codeOptions(
      [{ code: "P2", label: "Alta: bloquea a quien lo reporta." }],
      (codigo) => prioridad(codigo).label,
    );
    expect(conNombre[0]).toMatchObject({
      label: "P2 · Alta",
      description: "Alta: bloquea a quien lo reporta.",
    });
  });

  it("el filtro de causa raíz ofrece todas las causas del servidor", () => {
    const codigos = Array.from({ length: 13 }, (_, i) => ({
      code: `C${i}`,
      label: `Causa número ${i}.`,
    }));
    const opciones = causaRaizFiltroOptions(codigos);
    expect(opciones).toHaveLength(14);
    expect(opciones[0].label).toBe("Cualquiera");
    expect(opciones.some((o) => /UNKNOWN/.test(o.label))).toBe(false);
  });
});

describe("vistas de la bandeja", () => {
  /** Sin ellos, un caso en pausa o reabierto no salía en ninguna vista. */
  it("«Abiertos» incluye los casos en pausa y los reabiertos", () => {
    expect(ESTADOS_ABIERTOS.split(",")).toEqual(
      expect.arrayContaining(["ON_HOLD", "REOPENED"]),
    );
  });
});

function caso(internalStatus: string): SupportCase {
  return { caseId: "10", internalStatus } as SupportCase;
}

describe("CaseActions según el estado", () => {
  it("un caso asignado no deja resolver ni cerrar, y dice por qué", () => {
    render(<CaseActions caso={caso("ASSIGNED")} />);
    expect(screen.getByRole("button", { name: "Resolver" })).toBeDisabled();
    expect(
      screen.getByText(/responde al cliente por la conversación/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar caso" })).toBeDisabled();
    expect(
      screen.getByText(/Sólo se cierra un caso resuelto/),
    ).toBeInTheDocument();
  });

  it("un caso resuelto deja cerrar pero no transferir", () => {
    render(<CaseActions caso={caso("RESOLVED")} />);
    const textos = screen.getAllByRole("textbox");
    fireEvent.change(textos[textos.length - 1], {
      target: { value: "El cliente confirmó" },
    });
    expect(screen.getByRole("button", { name: "Cerrar caso" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Transferir" })).toBeDisabled();
  });

  it("un caso en curso deja resolver", () => {
    render(<CaseActions caso={caso("IN_PROGRESS")} />);
    expect(screen.getByRole("button", { name: "Resolver" })).toBeEnabled();
  });
});
