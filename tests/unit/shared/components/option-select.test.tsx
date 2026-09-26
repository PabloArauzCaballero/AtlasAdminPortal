import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OptionSelect } from "@/shared/components/ui/option-select";
import { Field } from "@/shared/components/ui/input";
import type { Option } from "@/shared/lib/options";

const ESTADOS: Option[] = [
  {
    value: "OPEN",
    label: "Abierto",
    description: "Nadie lo ha tomado todavía; sigue esperando a un analista.",
  },
  {
    value: "IN_REVIEW",
    label: "En revisión",
    description: "Un analista lo tiene asignado y está trabajando en él.",
  },
  {
    value: "CLOSED",
    label: "Cerrado",
    description: "Ya tiene desenlace y no admite más acciones.",
  },
];

const abrir = async () => {
  await userEvent.click(screen.getByRole("combobox"));
  return screen.getByRole("listbox");
};

describe("OptionSelect · lo que se ve", () => {
  it("cada fila enseña su descripción: eso es lo que un <option> nativo no sabe hacer", async () => {
    render(<OptionSelect name="estado" ariaLabel="Estado" options={ESTADOS} />);

    const lista = await abrir();

    for (const opcion of ESTADOS) {
      expect(within(lista).getByText(opcion.label)).toBeInTheDocument();
      expect(
        within(lista).getByText(opcion.description as string),
      ).toBeInTheDocument();
    }
  });

  it("la opción elegida repite su descripción bajo el campo", () => {
    render(
      <OptionSelect
        name="estado"
        ariaLabel="Estado"
        options={ESTADOS}
        value="CLOSED"
      />,
    );

    expect(screen.getByTestId("select-estado-descripcion")).toHaveTextContent(
      "Ya tiene desenlace",
    );
  });

  it("sin valor enseña el placeholder", () => {
    render(
      <OptionSelect
        name="estado"
        ariaLabel="Estado"
        options={ESTADOS}
        placeholder="Elige un estado"
      />,
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("Elige un estado");
  });

  it("sin opciones queda deshabilitado y lo dice", () => {
    render(<OptionSelect name="estado" ariaLabel="Estado" options={[]} />);

    const boton = screen.getByRole("combobox");
    expect(boton).toBeDisabled();
    expect(boton).toHaveTextContent("No hay datos registrados");
  });
});

describe("OptionSelect · el valor llega al formulario", () => {
  it("elegir una fila actualiza el input oculto y avisa al padre", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <OptionSelect
        name="estado"
        ariaLabel="Estado"
        options={ESTADOS}
        onChange={onChange}
      />,
    );

    await abrir();
    await userEvent.click(screen.getByTestId("select-estado-option-IN_REVIEW"));

    expect(onChange).toHaveBeenCalledWith("IN_REVIEW");
    expect(
      container.querySelector<HTMLInputElement>('input[name="estado"]')?.value,
    ).toBe("IN_REVIEW");
  });

  it("en un <form>, FormData trae el valor elegido", async () => {
    let enviado = "";
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          enviado = String(new FormData(event.currentTarget).get("estado"));
        }}
      >
        <OptionSelect name="estado" ariaLabel="Estado" options={ESTADOS} />
        <button type="submit">Enviar</button>
      </form>,
    );

    await abrir();
    await userEvent.click(screen.getByTestId("select-estado-option-CLOSED"));
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(enviado).toBe("CLOSED");
  });

  it("el control del valor NO es type=hidden: el navegador no valida `required` en un oculto", () => {
    const { container } = render(
      <OptionSelect
        name="estado"
        ariaLabel="Estado"
        options={ESTADOS}
        required
      />,
    );

    const oculto = container.querySelector<HTMLInputElement>(
      'input[name="estado"]',
    );
    expect(oculto?.type).not.toBe("hidden");
    expect(oculto?.required).toBe(true);
  });

  it("controlado: no cambia por su cuenta, sólo avisa", async () => {
    const onChange = vi.fn();
    render(
      <OptionSelect
        name="estado"
        ariaLabel="Estado"
        options={ESTADOS}
        value="OPEN"
        onChange={onChange}
      />,
    );

    await abrir();
    await userEvent.click(screen.getByTestId("select-estado-option-CLOSED"));

    expect(onChange).toHaveBeenCalledWith("CLOSED");
    expect(screen.getByRole("combobox")).toHaveTextContent("Abierto");
  });

  it("una opción deshabilitada no se elige", async () => {
    const onChange = vi.fn();
    render(
      <OptionSelect
        name="estado"
        ariaLabel="Estado"
        onChange={onChange}
        options={[
          ...ESTADOS,
          {
            value: "PURGED",
            label: "Purgado",
            description: "Sólo lo pone el proceso de retención de datos.",
            disabled: true,
          },
        ]}
      />,
    );

    await abrir();
    await userEvent.click(screen.getByTestId("select-estado-option-PURGED"));

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("OptionSelect · teclado", () => {
  it("abre con flecha abajo, mueve y elige con Enter", async () => {
    const onChange = vi.fn();
    render(
      <OptionSelect
        name="estado"
        ariaLabel="Estado"
        options={ESTADOS}
        onChange={onChange}
      />,
    );

    await userEvent.tab();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await userEvent.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith("IN_REVIEW");
  });

  it("Escape cierra y devuelve el foco al botón", async () => {
    render(<OptionSelect name="estado" ariaLabel="Estado" options={ESTADOS} />);

    await abrir();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("Inicio y Fin saltan a los extremos", async () => {
    const onChange = vi.fn();
    render(
      <OptionSelect
        name="estado"
        ariaLabel="Estado"
        options={ESTADOS}
        onChange={onChange}
      />,
    );

    await abrir();
    await userEvent.keyboard("{End}{Enter}");

    expect(onChange).toHaveBeenCalledWith("CLOSED");
  });

  it("escribir salta a la opción que empieza por esas letras", async () => {
    const onChange = vi.fn();
    render(
      <OptionSelect
        name="estado"
        ariaLabel="Estado"
        options={ESTADOS}
        onChange={onChange}
      />,
    );

    await abrir();
    await userEvent.keyboard("ce{Enter}");

    expect(onChange).toHaveBeenCalledWith("CLOSED");
  });
});

describe("OptionSelect · buscador", () => {
  const MUCHAS: Option[] = Array.from({ length: 12 }, (_, i) => ({
    value: `v${i}`,
    label: `Opción ${i}`,
    description:
      i === 7
        ? "Sólo para el canal de facturación mensual."
        : "Una opción cualquiera de la lista larga.",
  }));

  it("con más de ocho opciones aparece el buscador", async () => {
    render(<OptionSelect name="cosa" ariaLabel="Cosa" options={MUCHAS} />);

    await abrir();

    expect(
      screen.getByRole("searchbox", { name: "Buscar una opción" }),
    ).toBeInTheDocument();
  });

  it("filtra también por la descripción y sin tildes", async () => {
    render(<OptionSelect name="cosa" ariaLabel="Cosa" options={MUCHAS} />);

    await abrir();
    await userEvent.type(screen.getByRole("searchbox"), "facturacion");

    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option")).toHaveTextContent("Opción 7");
  });

  it("con ocho o menos no hay buscador", async () => {
    render(<OptionSelect name="estado" ariaLabel="Estado" options={ESTADOS} />);

    await abrir();

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});

describe("OptionSelect dentro de un Field", () => {
  it("toma el id del campo, así la etiqueta lo activa", async () => {
    render(
      <Field
        label="Estado del caso"
        tooltip="Acota la bandeja al momento del caso; en «Abierto» está lo que nadie ha tomado."
      >
        <OptionSelect name="estado" options={ESTADOS} />
      </Field>,
    );

    // El nombre accesible sale de la etiqueta, no del aria-label: el botón de ayuda no compite.
    const control = screen.getByLabelText("Estado del caso");
    expect(control).toHaveAttribute("role", "combobox");

    await userEvent.click(screen.getByText("Estado del caso"));
    expect(control).toHaveFocus();
  });

  it("enfocar el control abre la ayuda del campo", async () => {
    render(
      <Field
        label="Estado del caso"
        tooltip="Acota la bandeja al momento del caso; en «Abierto» está lo que nadie ha tomado."
      >
        <OptionSelect name="estado" options={ESTADOS} />
      </Field>,
    );

    // Dos tabuladores: el primero cae en el ⓘ (va antes en el DOM) y el segundo en el control.
    // Al segundo el icono ya ha perdido el foco, así que la burbuja abierta es la del CONTROL.
    await userEvent.tab();
    await userEvent.tab();

    expect(screen.getByRole("combobox")).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Acota la bandeja");
  });
});
