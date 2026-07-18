import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JsonCell } from "@/shared/components/ui/json-cell";
import { JsonViewer } from "@/shared/components/ui/json-viewer";

let copiado: string[] = [];

beforeEach(() => {
  copiado = [];
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: vi.fn(async (text: string) => {
        copiado.push(text);
      }),
    },
  });
});

describe("JsonCell · JSON válido", () => {
  it("formatea el JSON compacto en varias líneas", () => {
    render(<JsonCell value='{"sqlType":"bigint","nullable":false}' />);

    expect(screen.getByText(/"sqlType": "bigint"/)).toBeInTheDocument();
  });

  it("copia el JSON formateado, que es lo que el usuario ve", async () => {
    render(<JsonCell value='{"a":1}' />);

    await userEvent.click(screen.getByRole("button", { name: "Copiar" }));

    expect(copiado).toEqual(['{\n  "a": 1\n}']);
  });

  it("un array también es JSON formateable", () => {
    render(<JsonCell value="[1,2]" />);

    expect(screen.getByRole("button", { name: "Copiar" })).toBeInTheDocument();
  });
});

describe("JsonCell · valores que no son JSON de objeto", () => {
  it("un texto plano se muestra tal cual, sin botón de copiar", () => {
    render(<JsonCell value="no es json" />);

    expect(screen.getByText("no es json")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("JSON roto no revienta: cae a texto plano", () => {
    render(<JsonCell value='{"a":' />);

    expect(screen.getByText('{"a":')).toBeInTheDocument();
  });

  it("un escalar JSON (un número) se trata como texto, no como objeto", () => {
    // `JSON.parse("42")` funciona, pero formatearlo en un bloque <pre> con
    // botón de copiar para un "42" sería ruido.
    render(<JsonCell value="42" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("el literal null se trata como texto, no como objeto", () => {
    // `typeof null === "object"`: sin la guarda explícita, esto reventaría.
    render(<JsonCell value="null" />);

    expect(screen.getByText("null")).toBeInTheDocument();
  });
});

describe("JsonCell · sin valor", () => {
  it.each([null, undefined, ""])("%s se muestra como guion", (value) => {
    render(<JsonCell value={value} />);

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("JsonViewer", () => {
  it("formatea un objeto y lo titula 'JSON' por defecto", () => {
    render(<JsonViewer value={{ a: 1 }} />);

    expect(screen.getByText("JSON")).toBeInTheDocument();
    expect(screen.getByText(/"a": 1/)).toBeInTheDocument();
  });

  it("admite un título propio", () => {
    render(<JsonViewer value={{}} title="Payload de la request" />);

    expect(screen.getByText("Payload de la request")).toBeInTheDocument();
  });

  it("una string se muestra tal cual, sin volver a serializarla entre comillas", () => {
    render(<JsonViewer value="texto plano" />);

    expect(screen.getByText("texto plano")).toBeInTheDocument();
  });

  it("null se muestra como objeto vacío, no como 'null'", () => {
    render(<JsonViewer value={null} />);

    expect(screen.getByText("{}")).toBeInTheDocument();
  });

  it("copia el contenido que se ve", async () => {
    render(<JsonViewer value={{ b: 2 }} />);

    await userEvent.click(screen.getByRole("button", { name: "Copiar" }));

    expect(copiado).toEqual(['{\n  "b": 2\n}']);
  });
});
