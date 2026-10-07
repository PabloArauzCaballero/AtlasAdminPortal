import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PasswordInput } from "@/shared/components/ui/password-input";
import { PinInput } from "@/shared/components/ui/pin-input";

describe("PinInput · seis casillas, ni una más", () => {
  it("sólo admite dígitos y corta en seis", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PinInput aria-label="Código" onChange={onChange} />);
    const campo = screen.getByLabelText("Código");

    await user.type(campo, "12a b3-45678");

    expect(campo).toHaveValue("123456");
    expect(campo).toHaveAttribute("inputMode", "numeric");
    expect(campo).toHaveAttribute("autoComplete", "one-time-code");
  });

  it("un código pegado con espacios entra limpio", async () => {
    const user = userEvent.setup();
    render(<PinInput aria-label="Código" />);
    const campo = screen.getByLabelText("Código");

    await user.click(campo);
    await user.paste(" 48 15 16 ");

    expect(campo).toHaveValue("481516");
  });
});

describe("PasswordInput · el ojito", () => {
  it("empieza oculta y el botón la enseña y la vuelve a ocultar", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Clave" defaultValue="secreta" />);
    const campo = screen.getByLabelText("Clave");
    expect(campo).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Ver la clave" }));
    expect(campo).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Ocultar la clave" }));
    expect(campo).toHaveAttribute("type", "password");
  });

  it("el nombre del ojito no contiene la etiqueta del campo", () => {
    // `getByLabel("Contraseña")` casa por subcadena: con «Mostrar contraseña» encontraba dos.
    render(
      <label>
        Contraseña
        <PasswordInput />
      </label>,
    );
    expect(screen.getAllByLabelText(/contraseña/i)).toHaveLength(1);
  });

  it("el ojito no envía el formulario ni roba el Tab", () => {
    render(<PasswordInput aria-label="Clave" />);
    const ojito = screen.getByRole("button", { name: "Ver la clave" });

    expect(ojito).toHaveAttribute("type", "button");
    expect(ojito).toHaveAttribute("tabindex", "-1");
  });
});
