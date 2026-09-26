import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Field,
  Input,
  NativeSelect,
  Select,
  Textarea,
} from "@/shared/components/ui/input";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

describe("Field", () => {
  it("asocia la etiqueta al control por htmlFor, así lo nombra", () => {
    // Ya NO por envoltura: el botón de ayuda no puede vivir dentro del <label> sin meter su
    // propio nombre en el nombre accesible del campo. El `id` se lo pasa `Field` por contexto.
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

describe("Field · ayuda", () => {
  it("con tooltip pinta el ⓘ y el control lo enlaza con aria-describedby", () => {
    render(
      <Field
        label="Correo"
        tooltip="Buzón al que llegan los avisos del portal. Ej.: soporte@atlas.bo"
      >
        <Input />
      </Field>,
    );

    const ayuda = screen.getByRole("button", { name: "Ayuda: Correo" });
    const control = screen.getByLabelText("Correo");
    expect(ayuda).toBeInTheDocument();
    expect(control.getAttribute("aria-describedby")).toContain(
      ayuda.getAttribute("aria-describedby"),
    );
  });

  it("sin tooltip no hay botón de ayuda", () => {
    render(
      <Field label="Correo">
        <Input />
      </Field>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("enfocar el control abre la burbuja del campo", async () => {
    render(
      <Field
        label="Correo"
        tooltip="Buzón al que llegan los avisos del portal. Ej.: soporte@atlas.bo"
      >
        <Input />
      </Field>,
    );

    // Dos tabuladores: el primero cae en el ⓘ (va antes en el DOM) y el segundo en el control.
    // Al segundo el icono ya ha perdido el foco, así que la burbuja abierta es la del CONTROL.
    await userEvent.tab();
    await userEvent.tab();

    expect(screen.getByLabelText("Correo")).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Buzón al que llegan",
    );
  });

  it("el hint sigue estando, y además entra en la descripción del control", () => {
    render(
      <Field
        label="Correo"
        hint="Usa el corporativo"
        tooltip="Buzón al que llegan los avisos del portal."
      >
        <Input />
      </Field>,
    );

    const pista = screen.getByText("Usa el corporativo");
    expect(
      screen.getByLabelText("Correo").getAttribute("aria-describedby"),
    ).toContain(pista.id);
  });
});

describe("Select", () => {
  it("recibe opciones con descripción y devuelve el valor elegido", async () => {
    const onChange = vi.fn();
    render(
      <Select
        name="estado"
        ariaLabel="Estado"
        defaultValue="a"
        onChange={onChange}
        options={[
          {
            value: "a",
            label: "A",
            description: "La primera, la que se usa por defecto al crear.",
          },
          {
            value: "b",
            label: "B",
            description: "La segunda, sólo para casos ya revisados.",
          },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByTestId("select-estado-option-b"));

    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.getByRole("combobox")).toHaveTextContent("B");
  });
});

describe("NativeSelect", () => {
  it("sigue siendo un <select> nativo para las listas sin dominio que explicar", async () => {
    const onChange = vi.fn();
    render(
      <NativeSelect aria-label="Ruta" defaultValue="a" onChange={onChange}>
        <option value="a">/v1/a</option>
        <option value="b">/v1/b</option>
      </NativeSelect>,
    );

    await userEvent.selectOptions(screen.getByLabelText("Ruta"), "b");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Ruta")).toHaveValue("b");
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
