import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldHelpLabel, InfoDot } from "@/features/qa-tutorials/field-help";

describe("FieldHelpLabel / InfoDot", () => {
  it("pinta label, ayuda y ejemplo del catálogo", () => {
    render(<FieldHelpLabel fieldKey="case.expectedResult" htmlFor="exp" />);
    expect(screen.getByText("Resultado esperado")).toBeInTheDocument();
    expect(
      screen.getByText(/se compara con el resultado real/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ejemplo:/)).toBeInTheDocument();
  });

  it("degrada con gracia si la clave no está catalogada", () => {
    render(<FieldHelpLabel fieldKey="desconocido" fallbackLabel="Campo X" />);
    expect(screen.getByText("Campo X")).toBeInTheDocument();
  });

  it("InfoDot expone la ayuda a lectores de pantalla", () => {
    render(<InfoDot text="Explicación del campo" label="Prioridad" />);
    const trigger = screen.getByRole("button", {
      name: /Ayuda: Prioridad\. Explicación del campo/i,
    });
    expect(trigger).toBeInTheDocument();
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Explicación del campo",
    );
  });
});
