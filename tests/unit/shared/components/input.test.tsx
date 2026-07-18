import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/input";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

describe("Field", () => {
  it("envuelve el control en un <label>, así la etiqueta lo activa", () => {
    // El <label> envolvente es lo que da nombre accesible al input: sin él,
    // un lector de pantalla anuncia "cuadro de edición" y nada más.
    render(
      <Field label="Correo">
        <Input />
      </Field>,
    );

    expect(screen.getByLabelText("Correo")).toBeInTheDocument();
  });

  it("hace foco en el control al pulsar la etiqueta", async () => {
    render(
      <Field label="Correo">
        <Input />
      </Field>,
    );

    await userEvent.click(screen.getByText("Correo"));

    expect(screen.getByLabelText("Correo")).toHaveFocus();
  });

  it("muestra el hint cuando se pasa", () => {
    render(
      <Field label="Correo" hint="Usa el corporativo">
        <Input />
      </Field>,
    );

    expect(screen.getByText("Usa el corporativo")).toBeInTheDocument();
  });

  it("sin error no pinta mensaje de error", () => {
    const { container } = render(
      <Field label="Correo">
        <Input />
      </Field>,
    );

    expect(container.querySelector(".text-red-600")).toBeNull();
  });

  it("muestra el error de validación", () => {
    render(
      <Field label="Correo" error="Formato inválido">
        <Input />
      </Field>,
    );

    expect(screen.getByText("Formato inválido")).toBeInTheDocument();
  });

  it("hint y error pueden convivir", () => {
    render(
      <Field label="Correo" hint="Usa el corporativo" error="Formato inválido">
        <Input />
      </Field>,
    );

    expect(screen.getByText("Usa el corporativo")).toBeInTheDocument();
    expect(screen.getByText("Formato inválido")).toBeInTheDocument();
  });
});

describe("Input", () => {
  it("reenvía value y onChange al input nativo", async () => {
    const onChange = vi.fn();
    render(<Input aria-label="Buscar" value="" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Buscar"), "a");

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("deshabilitado no acepta escritura", async () => {
    const onChange = vi.fn();
    render(<Input aria-label="Buscar" disabled onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Buscar"), "a");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("reenvía type (p. ej. password)", () => {
    render(<Input aria-label="Clave" type="password" />);

    expect(screen.getByLabelText("Clave")).toHaveAttribute("type", "password");
  });
});

describe("Select", () => {
  it("reenvía la selección", async () => {
    const onChange = vi.fn();
    render(
      <Select aria-label="Estado" defaultValue="a" onChange={onChange}>
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>,
    );

    await userEvent.selectOptions(screen.getByLabelText("Estado"), "b");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Estado")).toHaveValue("b");
  });
});

describe("Textarea", () => {
  it("acepta texto multilínea", async () => {
    render(<Textarea aria-label="Notas" />);

    await userEvent.type(screen.getByLabelText("Notas"), "una{enter}dos");

    expect(screen.getByLabelText("Notas")).toHaveValue("una\ndos");
  });
});

describe("Card", () => {
  it("es una <section> y renderiza sus hijos", () => {
    const { container } = render(
      <Card>
        <CardHeader>Cabecera</CardHeader>
        <CardContent>Cuerpo</CardContent>
      </Card>,
    );

    expect(container.querySelector("section")).not.toBeNull();
    expect(screen.getByText("Cabecera")).toBeInTheDocument();
    expect(screen.getByText("Cuerpo")).toBeInTheDocument();
  });

  it("interactive añade la afordancia de hover", () => {
    const { container } = render(<Card interactive>X</Card>);

    expect(container.querySelector("section")?.className).toContain("hover:");
  });

  it("sin interactive no la añade", () => {
    const { container } = render(<Card>X</Card>);

    expect(container.querySelector("section")?.className).not.toContain(
      "hover:",
    );
  });

  it("las clases propias se suman a las base", () => {
    const { container } = render(<Card className="mi-clase">X</Card>);
    const className = container.querySelector("section")?.className ?? "";

    expect(className).toContain("mi-clase");
    expect(className).toContain("rounded-2xl");
  });
});
