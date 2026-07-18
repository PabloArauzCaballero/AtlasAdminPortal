import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { EndpointItem } from "@/features/systems/types";
import type { QaJourneyStepSpec } from "@/features/qa-lab/journey-types";
import { endpointFixture } from "./endpoint-fixture";

// El combobox de endpoints hace su propia query al catálogo; aquí solo
// interesa el contrato con la card: "cuando el usuario elige un endpoint…".
const selectedEndpoint = vi.hoisted(() => ({
  current: null as EndpointItem | null,
}));

vi.mock("@/features/qa-lab/journey-step-endpoint-select", () => ({
  JourneyStepEndpointSelect: ({
    onSelect,
  }: {
    endpointId: string;
    onSelect: (endpoint: EndpointItem) => void;
  }) => (
    <button
      type="button"
      onClick={() => onSelect(selectedEndpoint.current as EndpointItem)}
    >
      elegir endpoint
    </button>
  ),
}));

const { JourneyStepCard } = await import("@/features/qa-lab/journey-step-card");

function step(overrides: Partial<QaJourneyStepSpec> = {}): QaJourneyStepSpec {
  return {
    key: "health",
    name: "Health check",
    endpointId: "ep-1",
    ...overrides,
  };
}

function renderCard(
  props: Partial<Parameters<typeof JourneyStepCard>[0]> = {},
) {
  const onChange = vi.fn();
  const onMoveUp = vi.fn();
  const onMoveDown = vi.fn();
  const onRemove = vi.fn();
  render(
    <JourneyStepCard
      order={1}
      step={step()}
      canMoveUp
      canMoveDown
      onChange={onChange}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onRemove={onRemove}
      {...props}
    />,
  );
  return { onChange, onMoveUp, onMoveDown, onRemove };
}

/**
 * Variante controlada: la card no guarda el paso, lo devuelve por `onChange`.
 * Para escribir más de un carácter hace falta que el padre lo aplique de verdad,
 * si no cada tecla se evalúa contra el valor inicial.
 */
function renderStatefulCard(
  props: Partial<Parameters<typeof JourneyStepCard>[0]> = {},
): () => QaJourneyStepSpec {
  const initial = props.step ?? step();
  let latest = initial;
  function Harness() {
    const [current, setCurrent] = useState(initial);
    latest = current;
    return (
      <JourneyStepCard
        order={1}
        step={current}
        canMoveUp
        canMoveDown
        onChange={setCurrent}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onRemove={vi.fn()}
      />
    );
  }
  render(<Harness />);
  return () => latest;
}

describe("JourneyStepCard · identidad del paso", () => {
  it("muestra la posición del paso en la secuencia", () => {
    renderCard({ order: 3 });

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("editar la key propaga el paso completo, no solo la key", async () => {
    // `onChange` reemplaza el paso entero en el array del padre: si perdiera el
    // resto de campos, escribir en la key borraría payload/extract del paso.
    const { onChange } = renderCard({
      step: step({ key: "a", payload: { channel: "mobile_app" } }),
    });

    await userEvent.type(screen.getByPlaceholderText("key"), "b");

    expect(onChange).toHaveBeenCalledWith({
      key: "ab",
      name: "Health check",
      endpointId: "ep-1",
      payload: { channel: "mobile_app" },
    });
  });

  it("un paso sin nombre muestra el campo vacío, no la palabra 'undefined'", () => {
    renderCard({ step: step({ name: undefined }) });

    expect(
      screen.getByPlaceholderText("Nombre descriptivo del paso"),
    ).toHaveValue("");
  });
});

describe("JourneyStepCard · reordenar y eliminar", () => {
  it("el primer paso no puede subir y el último no puede bajar", () => {
    renderCard({ canMoveUp: false, canMoveDown: true });

    expect(screen.getByRole("button", { name: "Mover arriba" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mover abajo" })).toBeEnabled();
  });

  it("un paso intermedio puede moverse en ambos sentidos", async () => {
    const { onMoveUp, onMoveDown } = renderCard();

    await userEvent.click(screen.getByRole("button", { name: "Mover arriba" }));
    await userEvent.click(screen.getByRole("button", { name: "Mover abajo" }));

    expect(onMoveUp).toHaveBeenCalledTimes(1);
    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });

  it("eliminar avisa al padre", async () => {
    const { onRemove } = renderCard();

    await userEvent.click(
      screen.getByRole("button", { name: "Eliminar paso" }),
    );

    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe("JourneyStepCard · zona avanzada", () => {
  it("arranca plegada: los campos JSON no estorban al caso simple", () => {
    renderCard();

    expect(screen.queryByLabelText("Payload")).toBeNull();
    expect(
      screen.getByRole("button", {
        name: "Mostrar avanzado (path/query/payload/extract)",
      }),
    ).toBeInTheDocument();
  });

  it("se despliega y se vuelve a plegar", async () => {
    renderCard();
    const toggle = screen.getByRole("button", {
      name: "Mostrar avanzado (path/query/payload/extract)",
    });

    await userEvent.click(toggle);
    expect(screen.getByLabelText("Payload")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Ocultar avanzado" }),
    );
    expect(screen.queryByLabelText("Payload")).toBeNull();
  });

  it("cada campo JSON tiene su propio nombre accesible", async () => {
    // Los seis controles avanzados comparten placeholder "{}": sin etiqueta
    // asociada son indistinguibles para un lector de pantalla (y para un test).
    renderCard();
    await userEvent.click(
      screen.getByRole("button", {
        name: "Mostrar avanzado (path/query/payload/extract)",
      }),
    );

    for (const label of [
      "Path params",
      "Query params",
      "Payload",
      "Headers",
      "Extraer variables",
      "HTTP esperados",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });
});

describe("JourneyStepCard · campos JSON", () => {
  async function openAdvanced() {
    await userEvent.click(
      screen.getByRole("button", {
        name: "Mostrar avanzado (path/query/payload/extract)",
      }),
    );
  }

  it("un objeto existente se muestra formateado, no como [object Object]", async () => {
    renderCard({ step: step({ payload: { channel: "mobile_app" } }) });
    await openAdvanced();

    expect(screen.getByLabelText("Payload")).toHaveValue(
      '{\n  "channel": "mobile_app"\n}',
    );
  });

  it("un objeto vacío se muestra vacío para que el placeholder guíe", async () => {
    renderCard({ step: step({ payload: {} }) });
    await openAdvanced();

    expect(screen.getByLabelText("Payload")).toHaveValue("");
  });

  it("un JSON válido se confirma al salir del campo", async () => {
    const { onChange } = renderCard();
    await openAdvanced();

    await userEvent.type(screen.getByLabelText("Payload"), '{{"a": 1}');
    await userEvent.tab();

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { a: 1 } }),
    );
  });

  it("un JSON roto avisa y NO guarda basura en el paso", async () => {
    // Sin el aviso, el operador cree que su payload se guardó y ejecuta el
    // journey con el valor anterior.
    const { onChange } = renderCard();
    await openAdvanced();

    await userEvent.type(screen.getByLabelText("Payload"), "{{no soy json");
    await userEvent.tab();

    expect(screen.getByText("JSON inválido")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("un array se rechaza: los campos del paso son objetos", async () => {
    const { onChange } = renderCard();
    await openAdvanced();

    // `[[` escapa el corchete: userEvent lo reserva para modificadores.
    await userEvent.type(screen.getByLabelText("Payload"), "[[1, 2]");
    await userEvent.tab();

    expect(
      screen.getByText("Debe ser un objeto JSON, ej: {}"),
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("vaciar el campo guarda un objeto vacío y limpia el error previo", async () => {
    const { onChange } = renderCard({ step: step({ payload: { a: 1 } }) });
    await openAdvanced();
    const field = screen.getByLabelText("Payload");

    await userEvent.clear(field);
    await userEvent.type(field, "roto");
    await userEvent.tab();
    expect(screen.getByText("JSON inválido")).toBeInTheDocument();

    await userEvent.clear(field);
    await userEvent.tab();

    expect(screen.queryByText("JSON inválido")).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ payload: {} }),
    );
  });

  it("los HTTP esperados se leen como lista de números", async () => {
    const latest = renderStatefulCard({
      step: step({ expectedStatusCodes: [] }),
    });
    await openAdvanced();

    await userEvent.type(screen.getByLabelText("HTTP esperados"), "200, 201");

    expect(latest().expectedStatusCodes).toEqual([200, 201]);
  });

  it("basura entre los HTTP esperados se descarta en vez de colar un NaN", async () => {
    // Un NaN en la lista de esperados haría que ningún status coincidiera y el
    // paso fallara siempre sin explicación.
    const latest = renderStatefulCard({
      step: step({ expectedStatusCodes: [] }),
    });
    await openAdvanced();

    await userEvent.type(
      screen.getByLabelText("HTTP esperados"),
      "200, abc, 0",
    );

    expect(latest().expectedStatusCodes).toEqual([200]);
  });
});

describe("JourneyStepCard · elegir endpoint", () => {
  it("al elegir un endpoint guarda su id y lo identifica en pantalla", async () => {
    selectedEndpoint.current = endpointFixture({
      endpointId: "ep-77",
      method: "GET",
      fullPath: "/api/v1/health",
    });
    const { onChange } = renderCard({ step: step({ endpointId: "" }) });

    await userEvent.click(
      screen.getByRole("button", { name: "elegir endpoint" }),
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ endpointId: "ep-77" }),
    );
    expect(screen.getByText("GET /api/v1/health")).toBeInTheDocument();
  });

  it("un endpoint con preset autocompleta el paso vacío", async () => {
    selectedEndpoint.current = endpointFixture({
      endpointId: "ep-login",
      method: "POST",
      fullPath: "/auth/login",
    });
    const { onChange } = renderCard({ step: step({ endpointId: "" }) });

    await userEvent.click(
      screen.getByRole("button", { name: "elegir endpoint" }),
    );

    expect(onChange.mock.calls[0][0].payload).toMatchObject({
      actorType: "customer",
    });
  });

  it("el preset NO pisa un payload que el operador ya escribió", async () => {
    // Elegir el endpoint por segunda vez (o corregirlo) no puede borrar el
    // trabajo manual del paso.
    selectedEndpoint.current = endpointFixture({
      endpointId: "ep-login",
      method: "POST",
      fullPath: "/auth/login",
    });
    const { onChange } = renderCard({
      step: step({ endpointId: "", payload: { identifier: "mio@atlas.test" } }),
    });

    await userEvent.click(
      screen.getByRole("button", { name: "elegir endpoint" }),
    );

    expect(onChange).toHaveBeenCalledWith({
      key: "health",
      name: "Health check",
      endpointId: "ep-login",
      payload: { identifier: "mio@atlas.test" },
    });
  });
});
