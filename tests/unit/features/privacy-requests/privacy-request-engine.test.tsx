import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ENGINE_INPUT_LABELS,
  ENGINE_REASON_LABELS,
} from "@/features/privacy-requests/engine-labels";
import {
  EngineDecisionBadge,
  PrivacyRequestEngine,
} from "@/features/privacy-requests/privacy-request-engine";
import type { PrivacyEngineOpinion } from "@/features/privacy-requests/types";

/**
 * «Lo que opinó el Motor»: en sombra la opinión no cierra nada; se enseña para que la persona decida con la misma
 * información y para medir si coinciden. Tiene que decir qué recomienda, por qué en palabras del equipo, y con qué
 * hechos.
 */
const opinion: PrivacyEngineOpinion = {
  mode: "shadow",
  decision: "RECHAZAR",
  reasonCode: "DSR_BORRADO_CON_DEUDA",
  action: "NINGUNA",
  riskSignals: 0,
  reevaluateCredit: false,
  inputs: {
    dsr_tipo: "BORRADO",
    dsr_saldo_pendiente: 522.5,
    dsr_prestamos_activos: 1,
    dsr_pin_confirmado: true,
    dsr_fraude_abierto: false,
  },
  executionId: "exec-9",
  artifactCode: "PRIVACIDAD_SOLICITUD_TITULAR",
  artifactVersionId: "12",
  decidedAt: "2026-10-04T15:00:00.000Z",
  attempts: 1,
  lastError: null,
};

describe("Lo que opinó el Motor", () => {
  it("sin opinión no pinta nada", () => {
    const { container } = render(<PrivacyRequestEngine engine={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("dice qué recomienda, por qué en palabras del equipo y que es sólo una opinión", () => {
    render(<PrivacyRequestEngine engine={opinion} />);
    const bloque = screen.getByTestId("opinion-del-motor");
    expect(within(bloque).getByText("Rechazar")).toBeInTheDocument();
    expect(
      within(bloque).getByText(ENGINE_REASON_LABELS.DSR_BORRADO_CON_DEUDA),
    ).toBeInTheDocument();
    expect(within(bloque).getByText(/Modo sombra/)).toBeInTheDocument();
    expect(
      within(bloque).getByText(/PRIVACIDAD_SOLICITUD_TITULAR v12/),
    ).toBeInTheDocument();
  });

  it("enseña los hechos que vio, traducidos, y no el código interno de la variable", () => {
    render(<PrivacyRequestEngine engine={opinion} />);
    expect(screen.getByText("Saldo pendiente (Bs)")).toBeInTheDocument();
    expect(screen.getByText("522.5")).toBeInTheDocument();
    expect(screen.getByText("Confirmó su PIN al pedir")).toBeInTheDocument();
    expect(screen.queryByText("dsr_saldo_pendiente")).not.toBeInTheDocument();
  });

  it("si la corrección toca la línea, lo avisa", () => {
    render(
      <PrivacyRequestEngine
        engine={{
          ...opinion,
          decision: "REVISION_HUMANA",
          reasonCode: "DSR_AFECTA_CREDITO",
          reevaluateCredit: true,
        }}
      />,
    );
    expect(screen.getByText(/recalcular su línea/)).toBeInTheDocument();
    expect(screen.getByText("Que lo decida una persona")).toBeInTheDocument();
  });

  it("si el Motor no contestó, lo dice y deja claro que no hay que esperarlo", () => {
    render(
      <PrivacyRequestEngine
        engine={{
          ...opinion,
          decision: null,
          reasonCode: null,
          attempts: 2,
          lastError: "ECONNREFUSED",
        }}
      />,
    );
    expect(screen.getByText("El Motor no pudo opinar")).toBeInTheDocument();
    expect(screen.getByText(/2 veces: ECONNREFUSED/)).toBeInTheDocument();
  });

  it("un motivo que el portal no conoce se enseña tal cual, no se esconde", () => {
    render(
      <PrivacyRequestEngine
        engine={{ ...opinion, reasonCode: "DSR_NUEVO_QUE_NO_CONOZCO" }}
      />,
    );
    expect(screen.getByText("DSR_NUEVO_QUE_NO_CONOZCO")).toBeInTheDocument();
  });

  it("la etiqueta de la lista sólo aparece con opinión", () => {
    const { container, rerender } = render(
      <EngineDecisionBadge engine={null} />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<EngineDecisionBadge engine={opinion} />);
    expect(screen.getByText("Rechazar")).toBeInTheDocument();
  });

  it("cada uno de los 15 hechos de la cuenta tiene su etiqueta", () => {
    expect(ENGINE_INPUT_LABELS).toHaveLength(15);
    expect(new Set(ENGINE_INPUT_LABELS.map(([codigo]) => codigo)).size).toBe(
      15,
    );
  });

  it("cada motivo del artefacto tiene su frase", () => {
    for (const motivo of [
      "DSR_BORRADO_CON_DEUDA",
      "DSR_YA_EN_CURSO",
      "DSR_USAR_AUTOSERVICIO",
      "DSR_BORRADO_CON_RETENCION",
      "DSR_BORRADO_TOTAL",
      "DSR_CORRECCION_BAJO_RIESGO",
      "DSR_CASO_ABIERTO",
      "DSR_POSIBLE_ROBO_DE_CUENTA",
      "DSR_PROCESO_EN_CURSO",
      "DSR_ESTADO_DE_CUENTA",
      "DSR_CAMBIO_DE_IDENTIDAD",
      "DSR_AFECTA_CREDITO",
      "DSR_CAMPO_NO_CATALOGADO",
      "DSR_CAMBIOS_REPETIDOS",
      "DSR_SIN_CRITERIO_AUTOMATICO",
    ])
      expect(ENGINE_REASON_LABELS[motivo]).toEqual(expect.any(String));
  });
});
