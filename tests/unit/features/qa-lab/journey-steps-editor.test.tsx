import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { JourneyStepsEditor } from "@/features/qa-lab/journey-steps-editor";
import { parseSteps } from "@/features/qa-lab/journey-form";

vi.mock("@/features/qa-lab/journey-step-endpoint-select", () => ({
  JourneyStepEndpointSelect: () => null,
}));

const VALID_STEPS = JSON.stringify([
  { key: "health", name: "Health check", endpointId: "ep-1" },
]);

function renderEditor(initialText = VALID_STEPS) {
  const onParseError = vi.fn();
  let latest = initialText;
  function Harness() {
    const [text, setText] = useState(initialText);
    latest = text;
    return (
      <JourneyStepsEditor
        stepsText={text}
        onStepsTextChange={setText}
        parsedSteps={parseSteps(text)}
        onParseError={onParseError}
      />
    );
  }
  render(<Harness />);
  return { text: () => latest, onParseError };
}

async function switchToJson() {
  await userEvent.click(screen.getByRole("button", { name: "JSON / archivo" }));
}

/**
 * El `<input type="file">` va oculto a propósito: la afordancia es el botón
 * "Cargar payload". No hay query accesible que lo alcance.
 */
function fileInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

function jsonFile(name: string, content: string): File {
  return new File([content], name, { type: "application/json" });
}

describe("JourneyStepsEditor · modos de edición", () => {
  it("arranca en la tabla de secuencia, no en el JSON crudo", () => {
    renderEditor();

    expect(screen.getByRole("listitem")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cargar payload/ })).toBeNull();
  });

  it("se puede alternar a JSON/archivo y volver a la tabla", async () => {
    renderEditor();

    await switchToJson();
    // Por nombre accesible: el `<label>` del Field debe apuntar al textarea y
    // no al input de archivo oculto que vive a su lado.
    expect(
      screen.getByRole("textbox", { name: /Especificación de pasos/ }),
    ).toHaveValue(VALID_STEPS);
    expect(screen.queryByRole("listitem")).toBeNull();

    await userEvent.click(
      screen.getByRole("button", { name: "Tabla de secuencia" }),
    );
    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });

  it("con un JSON inválido la tabla se ve vacía en vez de reventar", async () => {
    // `parsedSteps.ok === false` no debe tumbar el editor: el usuario está a
    // media escritura y tiene que poder volver al modo JSON a arreglarlo.
    renderEditor("no soy json");

    expect(
      screen.getByText(
        "Sin pasos todavía. Agrega el primero para armar la secuencia.",
      ),
    ).toBeInTheDocument();
    await switchToJson();
    expect(
      screen.getByRole("textbox", { name: /Especificación de pasos/ }),
    ).toHaveValue("no soy json");
  });
});

describe("JourneyStepsEditor · las dos vistas son el mismo dato", () => {
  it("lo que se edita en la tabla se serializa al texto JSON", async () => {
    const { text } = renderEditor();

    await userEvent.click(screen.getByRole("button", { name: "Agregar paso" }));

    expect(JSON.parse(text())).toEqual([
      { key: "health", name: "Health check", endpointId: "ep-1" },
      {
        key: "paso_2",
        name: "",
        endpointId: "",
        expectedStatusCodes: [200, 201],
      },
    ]);
  });

  it("lo que se escribe en el JSON llega al padre tal cual", async () => {
    const { text } = renderEditor("[]");
    await switchToJson();

    await userEvent.type(
      screen.getByRole("textbox", { name: /Especificación de pasos/ }),
      "x",
    );

    expect(text()).toBe("[]x");
  });
});

describe("JourneyStepsEditor · carga de archivo", () => {
  it("un .json válido reemplaza los pasos y se acusa recibo del archivo", async () => {
    const { text } = renderEditor("[]");
    await switchToJson();

    await userEvent.upload(
      fileInput(),
      jsonFile("journey.json", '[{"key":"a","endpointId":"ep-9"}]'),
    );

    expect(JSON.parse(text())).toEqual([{ key: "a", endpointId: "ep-9" }]);
    expect(await screen.findByText("journey.json")).toBeInTheDocument();
  });

  it("el JSON cargado se reindenta para poder leerlo", async () => {
    const { text } = renderEditor("[]");
    await switchToJson();

    await userEvent.upload(
      fileInput(),
      jsonFile("j.json", '[{"key":"a","endpointId":"ep-9"}]'),
    );

    await screen.findByText("j.json");
    expect(text()).toContain("\n  ");
  });

  it("un archivo con JSON roto avisa y NO pisa los pasos actuales", async () => {
    // Sin esto el operador perdería la secuencia que llevaba escrita por
    // arrastrar el archivo equivocado.
    const { text, onParseError } = renderEditor(VALID_STEPS);
    await switchToJson();

    await userEvent.upload(fileInput(), jsonFile("malo.json", "{no json"));

    expect(onParseError).toHaveBeenCalledWith(
      'El archivo "malo.json" no contiene JSON válido.',
    );
    expect(text()).toBe(VALID_STEPS);
    expect(screen.queryByText("malo.json")).toBeNull();
  });

  it("el mismo archivo se puede recargar dos veces seguidas", async () => {
    // El input se limpia tras cada carga; si no, el segundo `change` con el
    // mismo path no dispara y el botón parece muerto.
    renderEditor("[]");
    await switchToJson();

    await userEvent.upload(
      fileInput(),
      jsonFile("j.json", '[{"key":"a","endpointId":"ep-9"}]'),
    );
    await screen.findByText("j.json");

    expect(fileInput().value).toBe("");
  });

  it("editar el JSON a mano descarta el nombre del archivo cargado", async () => {
    // El cartel "Cargado: x.json" dejaría de ser cierto y haría creer que se va
    // a ejecutar el archivo y no lo que hay en pantalla.
    renderEditor("[]");
    await switchToJson();
    await userEvent.upload(
      fileInput(),
      jsonFile("j.json", '[{"key":"a","endpointId":"ep-9"}]'),
    );
    await screen.findByText("j.json");

    await userEvent.type(
      screen.getByRole("textbox", { name: /Especificación de pasos/ }),
      " ",
    );

    expect(screen.queryByText("j.json")).toBeNull();
  });

  it("editar en la tabla también descarta el nombre del archivo cargado", async () => {
    renderEditor("[]");
    await switchToJson();
    await userEvent.upload(
      fileInput(),
      jsonFile("j.json", '[{"key":"a","endpointId":"ep-9"}]'),
    );
    await screen.findByText("j.json");
    await userEvent.click(
      screen.getByRole("button", { name: "Tabla de secuencia" }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Agregar paso" }));
    await switchToJson();

    expect(screen.queryByText("j.json")).toBeNull();
  });
});
