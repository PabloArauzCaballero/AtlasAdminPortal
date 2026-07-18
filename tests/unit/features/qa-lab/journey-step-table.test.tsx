import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { QaJourneyStepSpec } from "@/features/qa-lab/journey-types";

// El combobox del paso consulta el catálogo de endpoints; aquí sobra.
vi.mock("@/features/qa-lab/journey-step-endpoint-select", () => ({
  JourneyStepEndpointSelect: () => null,
}));

const { JourneySequenceTable } =
  await import("@/features/qa-lab/journey-step-table");

function step(key: string, extra: Partial<QaJourneyStepSpec> = {}) {
  return { key, name: key, endpointId: `ep-${key}`, ...extra };
}

/** Los pasos viven en el padre: sin aplicar `onChange` no se ve nada moverse. */
function renderTable(initial: QaJourneyStepSpec[]) {
  const onChangeSpy = vi.fn();
  let latest = initial;
  function Harness() {
    const [steps, setSteps] = useState(initial);
    latest = steps;
    return (
      <JourneySequenceTable
        steps={steps}
        onChange={(next) => {
          onChangeSpy(next);
          setSteps(next);
        }}
      />
    );
  }
  render(<Harness />);
  return { steps: () => latest, onChange: onChangeSpy };
}

function stepNames(): string[] {
  return screen
    .getAllByRole("listitem")
    .map(
      (item) =>
        within(item).getByPlaceholderText("key").getAttribute("value") ?? "",
    );
}

describe("JourneySequenceTable · secuencia vacía", () => {
  it("sin pasos invita a crear el primero en vez de dejar el hueco en blanco", () => {
    renderTable([]);

    expect(
      screen.getByText(
        "Sin pasos todavía. Agrega el primero para armar la secuencia.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).toBeNull();
  });

  it("siempre se puede agregar un paso, incluso desde vacío", async () => {
    const { steps } = renderTable([]);

    await userEvent.click(screen.getByRole("button", { name: "Agregar paso" }));

    expect(steps()).toEqual([
      {
        key: "paso_1",
        name: "",
        endpointId: "",
        expectedStatusCodes: [200, 201],
      },
    ]);
  });
});

describe("JourneySequenceTable · agregar y quitar", () => {
  it("el paso nuevo se numera detrás de los existentes", async () => {
    const { steps } = renderTable([step("a"), step("b")]);

    await userEvent.click(screen.getByRole("button", { name: "Agregar paso" }));

    expect(steps()).toHaveLength(3);
    expect(steps()[2].key).toBe("paso_3");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("eliminar quita exactamente el paso pulsado", async () => {
    const { steps } = renderTable([step("a"), step("b"), step("c")]);

    await userEvent.click(
      within(screen.getAllByRole("listitem")[1]).getByRole("button", {
        name: "Eliminar paso",
      }),
    );

    expect(steps().map((s) => s.key)).toEqual(["a", "c"]);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("eliminar el último paso deja la secuencia vacía y su mensaje", async () => {
    renderTable([step("a")]);

    await userEvent.click(
      screen.getByRole("button", { name: "Eliminar paso" }),
    );

    expect(
      screen.getByText(
        "Sin pasos todavía. Agrega el primero para armar la secuencia.",
      ),
    ).toBeInTheDocument();
  });
});

describe("JourneySequenceTable · reordenar", () => {
  it("los extremos no pueden salirse de la lista", () => {
    renderTable([step("a"), step("b"), step("c")]);
    const items = screen.getAllByRole("listitem");

    expect(
      within(items[0]).getByRole("button", { name: "Mover arriba" }),
    ).toBeDisabled();
    expect(
      within(items[2]).getByRole("button", { name: "Mover abajo" }),
    ).toBeDisabled();
    // Los del medio sí.
    expect(
      within(items[1]).getByRole("button", { name: "Mover arriba" }),
    ).toBeEnabled();
  });

  it("subir un paso lo intercambia con el anterior y se ve reordenado", async () => {
    // El orden es el contrato del journey: los pasos posteriores consumen
    // variables extraídas por los previos.
    const { steps } = renderTable([step("a"), step("b"), step("c")]);

    await userEvent.click(
      within(screen.getAllByRole("listitem")[2]).getByRole("button", {
        name: "Mover arriba",
      }),
    );

    expect(steps().map((s) => s.key)).toEqual(["a", "c", "b"]);
    expect(stepNames()).toEqual(["a", "c", "b"]);
  });

  it("bajar un paso lo intercambia con el siguiente", async () => {
    const { steps } = renderTable([step("a"), step("b"), step("c")]);

    await userEvent.click(
      within(screen.getAllByRole("listitem")[0]).getByRole("button", {
        name: "Mover abajo",
      }),
    );

    expect(steps().map((s) => s.key)).toEqual(["b", "a", "c"]);
  });

  it("mover no duplica ni pierde pasos", async () => {
    const { steps } = renderTable([step("a"), step("b")]);

    await userEvent.click(
      within(screen.getAllByRole("listitem")[1]).getByRole("button", {
        name: "Mover arriba",
      }),
    );
    await userEvent.click(
      within(screen.getAllByRole("listitem")[1]).getByRole("button", {
        name: "Mover arriba",
      }),
    );

    expect(steps().map((s) => s.key)).toEqual(["a", "b"]);
  });
});

describe("JourneySequenceTable · edición de un paso", () => {
  it("editar un paso no toca a sus vecinos", async () => {
    const { steps } = renderTable([step("a"), step("b")]);

    await userEvent.type(
      within(screen.getAllByRole("listitem")[0]).getByPlaceholderText("key"),
      "X",
    );

    expect(steps()[0].key).toBe("aX");
    expect(steps()[1]).toEqual(step("b"));
  });

  it("los pasos se numeran desde 1 según su posición actual", async () => {
    renderTable([step("a"), step("b")]);

    expect(
      within(screen.getAllByRole("listitem")[0]).getByText("1"),
    ).toBeInTheDocument();
    expect(
      within(screen.getAllByRole("listitem")[1]).getByText("2"),
    ).toBeInTheDocument();
  });
});

describe("JourneySequenceTable · estado interno tras eliminar", () => {
  it("HOY el JSON avanzado del paso eliminado se queda pegado al siguiente (comportamiento fijado, es un bug)", async () => {
    // OJO: esto NO es la garantía deseada, es lo que hace el código hoy.
    //
    // `<li key={index}>`: al borrar el paso 1, el paso 2 pasa a ocupar el
    // índice 0 y React REUSA la instancia de la card anterior. El texto del
    // campo Payload vive en un `useState` inicializado solo al montar, así que
    // el operador ve el payload del paso BORRADO sobre el paso que queda — y si
    // toca el campo, ese payload ajeno se confirma sobre el paso superviviente.
    //
    // No se corrige aquí porque la alternativa obvia (`key={step.key}`, como ya
    // hace `journey-step-results.tsx`) remonta la card en cada tecla del campo
    // "key" y le roba el foco al operador. La solución real es dar a cada paso
    // un id estable de cliente que no se serialice al JSON — es una decisión de
    // diseño del modelo, no un arreglo local.
    renderTable([
      step("a", { payload: { soy: "el paso A" } }),
      step("b", { payload: { soy: "el paso B" } }),
    ]);
    const items = screen.getAllByRole("listitem");
    await userEvent.click(
      within(items[0]).getByRole("button", {
        name: "Mostrar avanzado (path/query/payload/extract)",
      }),
    );
    expect(screen.getByLabelText("Payload")).toHaveValue(
      '{\n  "soy": "el paso A"\n}',
    );

    await userEvent.click(
      within(items[0]).getByRole("button", { name: "Eliminar paso" }),
    );

    expect(stepNames()).toEqual(["b"]);
    // Debería mostrar el payload de B; muestra el de A.
    expect(screen.getByLabelText("Payload")).toHaveValue(
      '{\n  "soy": "el paso A"\n}',
    );
  });
});
