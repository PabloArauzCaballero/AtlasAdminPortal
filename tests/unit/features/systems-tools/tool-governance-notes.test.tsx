import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolGovernanceNotes } from "@/features/systems-tools/tool-governance-notes";
import type { ToolItem } from "@/features/systems/types/catalog-types";

/**
 * La ficha de gobierno es lo que alguien lee en mitad de un incidente para saber qué deja de
 * funcionar si una herramienta cae. Dos comportamientos la hacen fiable: que muestre los textos
 * que el backend manda, y que un catálogo antiguo —sin esos campos— no rompa la pantalla ni finja
 * que la información existe.
 */
const BASE_TOOL: ToolItem = {
  toolId: "27",
  code: "DECISION_ENGINE",
  name: "ATLAS Decision Engine",
  type: "DECISION_SERVICE",
  provider: "ATLAS",
  purpose: "Motor de políticas versionadas.",
  requiredEnvVars: ["DECISION_ENGINE_HEALTH_BASE_URL"],
  hasSandbox: true,
  healthcheckRoute: "/health",
  requiresCredentials: true,
  isCritical: true,
  status: "ACTIVE",
  ownerTeam: "Riesgo y Decisión",
};

describe("ToolGovernanceNotes", () => {
  it("muestra cada texto de gobierno que llega del backend", () => {
    render(
      <ToolGovernanceNotes
        tool={{
          ...BASE_TOOL,
          description: "Servicio externo con repositorio propio.",
          businessValue: "Decisiones de crédito trazables y versionadas.",
          technicalUsage: "Se llama por HTTP desde el módulo decision-engine.",
          auditNotes: "Las decisiones se referencian por sujeto opaco.",
          failureRisks: "Caído, el crédito cae a revisión manual.",
        }}
      />,
    );
    expect(screen.getByText("Valor de negocio")).toBeInTheDocument();
    expect(
      screen.getByText("Caído, el crédito cae a revisión manual."),
    ).toBeInTheDocument();
    expect(screen.getByText("Notas de auditoría")).toBeInTheDocument();
  });

  it("omite las secciones sin texto en vez de pintar etiquetas huérfanas", () => {
    render(
      <ToolGovernanceNotes
        tool={{ ...BASE_TOOL, businessValue: "Sólo esto está documentado." }}
      />,
    );
    expect(screen.getByText("Valor de negocio")).toBeInTheDocument();
    expect(screen.queryByText("Riesgos ante fallo")).not.toBeInTheDocument();
  });

  it("un texto en blanco cuenta como ausente: espacios no son documentación", () => {
    render(
      <ToolGovernanceNotes tool={{ ...BASE_TOOL, businessValue: "   " }} />,
    );
    expect(screen.queryByText("Valor de negocio")).not.toBeInTheDocument();
    expect(
      screen.getByText(/no tiene metadata de gobierno registrada/i),
    ).toBeInTheDocument();
  });

  it("una herramienta de un catálogo antiguo no rompe la ficha y explica el hueco", () => {
    render(<ToolGovernanceNotes tool={BASE_TOOL} />);
    expect(
      screen.getByText(/no tiene metadata de gobierno registrada/i),
    ).toBeInTheDocument();
    // Dice de dónde sale, para que nadie la busque en un formulario que no existe.
    expect(screen.getByText(/SYSTEM_TOOL_SEEDS/)).toBeInTheDocument();
  });
});
