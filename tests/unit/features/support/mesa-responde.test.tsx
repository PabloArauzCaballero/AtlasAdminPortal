import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tomar = { mutate: vi.fn(), isPending: false, error: null as unknown };
vi.mock("@/features/support/hooks", () => ({
  useClaimChannelMutation: () => tomar,
}));

import { UnirseALaConversacion } from "@/features/support/chat-join";
import { MisConversaciones } from "@/features/support/my-conversations";

/**
 * Que un agente pueda llegar a contestar.
 *
 * Antes la ficha pintaba el cuadro de respuesta aunque el agente no estuviera dentro del chat, y
 * cada envío volvía con «Este canal no está abierto para este usuario». Y un chat que el reparto
 * asignaba solo no aparecía en ninguna lista. Estas pruebas fijan las dos salidas.
 */
describe("UnirseALaConversacion", () => {
  beforeEach(() => tomar.mutate.mockReset());

  it("con la persona en espera, ofrece atenderla y toma ESE canal", () => {
    render(<UnirseALaConversacion channelId="17" status="QUEUED" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Atender esta conversación" }),
    );
    expect(tomar.mutate).toHaveBeenCalledWith("17");
  });

  it("si ya la lleva otra persona, no ofrece atender: explica cómo entrar", () => {
    render(<UnirseALaConversacion channelId="17" status="OPEN" />);

    expect(
      screen.queryByRole("button", { name: "Atender esta conversación" }),
    ).toBeNull();
    expect(
      screen.getByText(/usa «Tomar» en las acciones del caso/),
    ).toBeInTheDocument();
  });
});

describe("MisConversaciones", () => {
  it("lleva a la ficha del caso de cada conversación mía", () => {
    render(
      <MisConversaciones
        canales={[
          {
            channelId: "8",
            caseId: "40",
            status: "OPEN",
            channelType: "CHAT",
            requestedAt: "2026-09-26T20:00:00Z",
            openedAt: "2026-09-26T20:01:00Z",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Abrir y responder" }),
    ).toHaveAttribute("href", "/internal/support/cases/40");
  });

  it("sin conversaciones no pinta nada", () => {
    const { container } = render(<MisConversaciones canales={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
