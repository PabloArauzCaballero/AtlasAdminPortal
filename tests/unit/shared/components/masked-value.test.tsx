import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MaskedValue } from "@/shared/components/security/masked-value";

describe("MaskedValue", () => {
  it("muestra el valor enmascarado por defecto", () => {
    render(<MaskedValue value="juan@atlas.bo" type="email" />);
    expect(screen.getByText(/@atlas\.bo/)).toBeInTheDocument();
    expect(screen.queryByText("juan@atlas.bo")).not.toBeInTheDocument();
  });

  it("sin canReveal no ofrece botón de revelar", () => {
    render(<MaskedValue value="71234567" type="phone" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("con canReveal muestra el valor completo al pulsar", async () => {
    const user = userEvent.setup();
    render(<MaskedValue value="71234567" type="phone" canReveal />);

    await user.click(screen.getByRole("button", { name: "Revelar dato" }));

    expect(screen.getByText("71234567")).toBeInTheDocument();
  });

  it("audita el revelado mediante onReveal (solo al revelar)", async () => {
    const onReveal = vi.fn();
    const user = userEvent.setup();
    render(
      <MaskedValue
        value="71234567"
        type="phone"
        canReveal
        onReveal={onReveal}
      />,
    );
    const button = screen.getByRole("button");

    await user.click(button); // revelar
    await user.click(button); // ocultar

    expect(onReveal).toHaveBeenCalledOnce();
  });

  it("renderiza un guion cuando no hay valor", () => {
    render(<MaskedValue value={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
