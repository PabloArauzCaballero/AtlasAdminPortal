import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { FormSelect } from "@/shared/components/ui/form-select";
import { Field } from "@/shared/components/ui/input";
import type { Option } from "@/shared/lib/options";

const RESOLUCIONES: Option[] = [
  {
    value: "resolved",
    label: "Resuelto",
    description: "El dato se corrigió en origen y la regla ya no salta.",
  },
  {
    value: "ignored",
    label: "Ignorado",
    description: "Se acepta la desviación: es correcta para este negocio.",
  },
];

function Formulario({
  onSubmit,
}: Readonly<{ onSubmit: (valores: { resolucion: string }) => void }>) {
  const { control, handleSubmit } = useForm<{ resolucion: string }>({
    defaultValues: { resolucion: "resolved" },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Field
        label="Resolución"
        tooltip="Qué se hizo con el issue: corregirlo en origen o aceptarlo como está."
      >
        <FormSelect
          control={control}
          name="resolucion"
          options={RESOLUCIONES}
        />
      </Field>
      <button type="submit">Guardar</button>
    </form>
  );
}

describe("FormSelect", () => {
  it("arranca con el valor por defecto del formulario", () => {
    render(<Formulario onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("Resolución")).toHaveTextContent("Resuelto");
  });

  it("lo elegido llega al submit de react-hook-form", async () => {
    const onSubmit = vi.fn();
    render(<Formulario onSubmit={onSubmit} />);

    await userEvent.click(screen.getByLabelText("Resolución"));
    await userEvent.click(
      screen.getByTestId("select-resolucion-option-ignored"),
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      resolucion: "ignored",
    });
  });

  it("enseña la descripción de la opción elegida bajo el campo", async () => {
    render(<Formulario onSubmit={vi.fn()} />);

    expect(
      screen.getByTestId("select-resolucion-descripcion"),
    ).toHaveTextContent("El dato se corrigió en origen");
  });
});
