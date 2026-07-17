import { describe, expect, it } from "vitest";
import {
  allowedDecisions,
  canActivateRuleset,
  canSubmitForApproval,
  DECISION_LABELS,
  isTerminalStatus,
  requiresTypedConfirmation,
  STATUS_HELP,
  STATUS_LABELS,
} from "@/features/operations/catalog-version-lifecycle";
import type { CatalogVersionStatus } from "@/features/operations/catalog-version-types";

const ALL_STATUSES: CatalogVersionStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "published",
  "retired",
  "rejected",
];

describe("canSubmitForApproval", () => {
  it("solo acepta borradores: el backend responde 422 CATALOG_VERSION_NOT_DRAFT en el resto", () => {
    expect(canSubmitForApproval("draft")).toBe(true);
    for (const status of ALL_STATUSES.filter((s) => s !== "draft")) {
      expect(canSubmitForApproval(status)).toBe(false);
    }
  });
});

describe("allowedDecisions", () => {
  it("no ofrece decisiones sobre un borrador: primero hay que enviarlo a aprobación", () => {
    expect(allowedDecisions("draft")).toEqual([]);
  });

  it("ofrece aprobar y rechazar solo cuando está pendiente de aprobación", () => {
    expect(allowedDecisions("pending_approval")).toEqual(["approve", "reject"]);
  });

  it("no permite publicar desde pending_approval aunque el backend lo acepte", () => {
    // La guarda del backend acepta ['approved','pending_approval'], pero
    // publicar sin pasar por approve saltearía el registro de aprobación, que
    // es justo el punto del flujo de cuatro ojos.
    expect(allowedDecisions("pending_approval")).not.toContain("publish");
    expect(allowedDecisions("approved")).toEqual(["publish"]);
  });

  it("solo permite retirar lo que está publicado", () => {
    expect(allowedDecisions("published")).toEqual(["retire"]);
    // El backend no tiene guarda para `retire`: retirar un borrador sería un
    // estado que después nadie sabe explicar. Se restringe acá.
    expect(allowedDecisions("draft")).not.toContain("retire");
    expect(allowedDecisions("approved")).not.toContain("retire");
  });

  it("no permite rechazar algo ya publicado o retirado, aunque el backend no lo valide", () => {
    expect(allowedDecisions("published")).not.toContain("reject");
    expect(allowedDecisions("retired")).not.toContain("reject");
    expect(allowedDecisions("rejected")).not.toContain("reject");
  });

  it("no deja acciones sobre estados de historial", () => {
    expect(allowedDecisions("retired")).toEqual([]);
    expect(allowedDecisions("rejected")).toEqual([]);
  });
});

describe("isTerminalStatus", () => {
  it("marca como historial los estados sin ninguna acción posible", () => {
    expect(isTerminalStatus("retired")).toBe(true);
    expect(isTerminalStatus("rejected")).toBe(true);
  });

  it("no marca como historial los estados que todavía admiten avanzar el flujo", () => {
    expect(isTerminalStatus("draft")).toBe(false);
    expect(isTerminalStatus("pending_approval")).toBe(false);
    expect(isTerminalStatus("approved")).toBe(false);
    expect(isTerminalStatus("published")).toBe(false);
  });
});

describe("canActivateRuleset", () => {
  it("acepta los estados activables del backend", () => {
    // Fuera de estos, el backend responde 422 RULESET_VERSION_NOT_ACTIVATABLE.
    expect(canActivateRuleset("draft")).toBe(true);
    expect(canActivateRuleset("inactive")).toBe(true);
    expect(canActivateRuleset("approved")).toBe(true);
  });

  it("rechaza estados no activables en vez de pintar un botón que dará 422", () => {
    expect(canActivateRuleset("active")).toBe(false);
    expect(canActivateRuleset("retired")).toBe(false);
  });

  it("trata un status ausente como no activable", () => {
    expect(canActivateRuleset(null)).toBe(false);
    expect(canActivateRuleset(undefined)).toBe(false);
    expect(canActivateRuleset("")).toBe(false);
  });
});

describe("requiresTypedConfirmation", () => {
  it("exige doble confirmación en las decisiones que tocan producción", () => {
    // Publicar cambia lo que leen las reglas en vivo; retirar lo saca de servicio.
    expect(requiresTypedConfirmation("publish")).toBe(true);
    expect(requiresTypedConfirmation("retire")).toBe(true);
  });

  it("no la exige para aprobar ni rechazar, que no cambian lo vigente", () => {
    expect(requiresTypedConfirmation("approve")).toBe(false);
    expect(requiresTypedConfirmation("reject")).toBe(false);
  });
});

describe("catálogo de etiquetas", () => {
  it("tiene etiqueta y ayuda en español para todos los estados del contrato", () => {
    // Un estado sin entrada se pintaría vacío en la ficha de la versión.
    for (const status of ALL_STATUSES) {
      expect(STATUS_LABELS[status]).toBeTruthy();
      expect(STATUS_HELP[status]).toBeTruthy();
    }
  });

  it("tiene etiqueta para toda decisión ofrecida por algún estado", () => {
    for (const status of ALL_STATUSES) {
      for (const decision of allowedDecisions(status)) {
        expect(DECISION_LABELS[decision]).toBeTruthy();
      }
    }
  });
});
