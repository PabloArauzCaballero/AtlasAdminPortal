import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  KeyValueGrid,
  KeyValueSection,
} from "@/shared/components/data-display/key-value";

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn(async () => undefined) },
  });
});

/** Texto del <dd> que sigue al <dt> con esa etiqueta. */
function valueOf(label: string) {
  const term = screen.getByText(label);
  return term.nextElementSibling?.textContent;
}

describe("KeyValueGrid · semántica", () => {
  it("usa lista de definición: cada etiqueta es un <dt> con su <dd>", () => {
    // Un <dl> es lo que hace que un lector de pantalla asocie etiqueta y valor;
    // con <div>s sueltos se leería como texto suelto.
    const { container } = render(
      <KeyValueGrid items={[{ label: "Estado", value: "ACTIVE" }]} />,
    );

    expect(container.querySelector("dl")).not.toBeNull();
    expect(container.querySelector("dt")?.textContent).toBe("Estado");
    expect(container.querySelector("dd")?.textContent).toBe("ACTIVE");
  });

  it("pinta un ítem por entrada", () => {
    const { container } = render(
      <KeyValueGrid
        items={[
          { label: "Estado", value: "ACTIVE" },
          { label: "Módulo", value: "qa-lab" },
        ]}
      />,
    );

    expect(container.querySelectorAll("dt")).toHaveLength(2);
  });

  it("una lista vacía no revienta", () => {
    const { container } = render(<KeyValueGrid items={[]} />);

    expect(container.querySelectorAll("dt")).toHaveLength(0);
  });
});

describe("KeyValueGrid · formato de valores", () => {
  it("los booleanos se leen en español, no como 'true'/'false'", () => {
    render(
      <KeyValueGrid
        items={[
          { label: "Activo", value: true },
          { label: "Borrado", value: false },
        ]}
      />,
    );

    expect(valueOf("Activo")).toBe("Sí");
    expect(valueOf("Borrado")).toBe("No");
  });

  it("false no se confunde con 'sin dato'", () => {
    // Con un `value || "—"` ingenuo, un false se pintaría como guion y el
    // usuario no sabría si el flag está apagado o si falta el dato.
    render(<KeyValueGrid items={[{ label: "PII", value: false }]} />);

    expect(valueOf("PII")).toBe("No");
  });

  it("null, undefined y cadena vacía se muestran como guion", () => {
    render(
      <KeyValueGrid
        items={[
          { label: "A", value: null },
          { label: "B", value: undefined },
          { label: "C", value: "" },
        ]}
      />,
    );

    expect(valueOf("A")).toBe("—");
    expect(valueOf("B")).toBe("—");
    expect(valueOf("C")).toBe("—");
  });

  it("el cero se muestra, no se traga como valor vacío", () => {
    render(<KeyValueGrid items={[{ label: "Errores", value: 0 }]} />);

    expect(valueOf("Errores")).toBe("0");
  });

  it("un objeto se serializa en vez de romper el render", () => {
    render(<KeyValueGrid items={[{ label: "Meta", value: { a: 1 } }]} />);

    expect(valueOf("Meta")).toBe('{"a":1}');
  });
});

describe("KeyValueGrid · valores mono", () => {
  it("un valor mono se puede copiar", () => {
    render(
      <KeyValueGrid items={[{ label: "ID", value: "usr_123", mono: true }]} />,
    );

    expect(screen.getByRole("button", { name: "Copiar" })).toBeInTheDocument();
    expect(screen.getByText("usr_123")).toBeInTheDocument();
  });

  it("mono copia el valor ya formateado, no el crudo", () => {
    // `resolveValue` normaliza antes de decidir el render, así que lo copiable
    // es siempre lo que se ve ("Sí"), nunca el `true` de origen.
    render(
      <KeyValueGrid items={[{ label: "Activo", value: true, mono: true }]} />,
    );

    expect(screen.getByText("Sí")).toBeInTheDocument();
  });

  it("sin mono no hay botón de copiar", () => {
    render(<KeyValueGrid items={[{ label: "ID", value: "usr_123" }]} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("KeyValueGrid · tonos", () => {
  it("cada tono marca la fila de forma distinta", () => {
    // El tono es la única señal de que una fila es crítica; si dos tonos
    // colapsan en la misma clase, la señal desaparece.
    const tones = [
      "success",
      "warning",
      "critical",
      "muted",
      "default",
    ] as const;
    const marcas = tones.map((tone) => {
      const { container, unmount } = render(
        <KeyValueGrid items={[{ label: "X", value: "1", tone }]} />,
      );
      const marca = container.querySelector("dl > div")?.className ?? "";
      unmount();
      return marca;
    });

    expect(new Set(marcas).size).toBe(tones.length);
  });
});

describe("KeyValueSection", () => {
  it("el título es un encabezado y los ítems se renderizan dentro", () => {
    render(
      <KeyValueSection
        title="Identidad"
        items={[{ label: "Estado", value: "ACTIVE" }]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Identidad" }),
    ).toBeInTheDocument();
    expect(valueOf("Estado")).toBe("ACTIVE");
  });

  it("la descripción es opcional", () => {
    render(<KeyValueSection title="Identidad" items={[]} />);

    expect(
      screen.getByRole("heading", { name: "Identidad" }),
    ).toBeInTheDocument();
  });

  it("muestra la descripción cuando se pasa", () => {
    render(
      <KeyValueSection
        title="Identidad"
        description="Datos del usuario interno."
        items={[]}
      />,
    );

    expect(screen.getByText("Datos del usuario interno.")).toBeInTheDocument();
  });
});
