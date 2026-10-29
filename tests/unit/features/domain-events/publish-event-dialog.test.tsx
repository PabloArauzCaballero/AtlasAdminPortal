import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublishEventDialog } from "@/features/domain-events/publish-event-dialog";
import type { DomainEventDefinition } from "@/features/domain-events/types";
import { valoresDeOpciones } from "../../shared/option-select-helpers";
import { renderWithProviders } from "../../../helpers/render-with-providers";

vi.mock("@/features/domain-events/hooks", () => ({
  usePublishEventMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

const definicion = (
  eventCode: string,
  reservedForSystem: boolean,
): DomainEventDefinition => ({
  eventCode,
  family: null,
  version: 1,
  description: null,
  defaultPriority: null,
  allowedAggregateTypes: [],
  reservedForSystem,
});

describe("PublishEventDialog — eventos reservados (OBS-19)", () => {
  it("no ofrece los eventos que sólo publica su productor", async () => {
    renderWithProviders(
      <PublishEventDialog
        open
        onClose={() => undefined}
        definiciones={[
          definicion("bank_statement.in_review", true),
          definicion("loan.disbursed", false),
        ]}
      />,
    );
    const valores = await valoresDeOpciones(
      screen.getByLabelText("Código de evento"),
    );
    expect(valores).toContain("loan.disbursed");
    expect(valores).not.toContain("bank_statement.in_review");
  });
});
