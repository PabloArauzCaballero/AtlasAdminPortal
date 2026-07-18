import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";

describe("PageHeader", () => {
  it("el título de la vista es el h1", () => {
    // Un solo h1 por pantalla es lo que da estructura a la navegación por
    // encabezados.
    render(<PageHeader title="Endpoints" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Endpoints" }),
    ).toBeInTheDocument();
  });

  it("eyebrow, descripción y acciones son opcionales", () => {
    render(<PageHeader title="Endpoints" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });

  it("muestra eyebrow y descripción cuando se pasan", () => {
    render(
      <PageHeader
        title="Endpoints"
        eyebrow="Systems Ops"
        description="Inventario de operaciones expuestas."
      />,
    );

    expect(screen.getByText("Systems Ops")).toBeInTheDocument();
    expect(
      screen.getByText("Inventario de operaciones expuestas."),
    ).toBeInTheDocument();
  });

  it("las acciones se renderizan y siguen siendo operables", async () => {
    render(
      <PageHeader
        title="Endpoints"
        actions={<button type="button">Exportar</button>}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Exportar" }));

    expect(screen.getByRole("button", { name: "Exportar" })).toBeEnabled();
  });

  it("un título muy largo se renderiza entero", () => {
    const largo = "Endpoints ".repeat(30).trim();
    render(<PageHeader title={largo} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(largo);
  });
});

describe("SectionHeader", () => {
  it("es un h2: cuelga del h1 de la página", () => {
    render(<SectionHeader title="Columnas" />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Columnas" }),
    ).toBeInTheDocument();
  });

  it("la descripción es opcional", () => {
    render(
      <SectionHeader title="Columnas" description="Del esquema actual." />,
    );

    expect(screen.getByText("Del esquema actual.")).toBeInTheDocument();
  });
});

describe("MetricCard", () => {
  it("los números se formatean con separador de miles", () => {
    render(<MetricCard label="Endpoints" value={12345} />);

    expect(screen.getByText("12.345")).toBeInTheDocument();
  });

  it("el cero se muestra, no se traga", () => {
    // Un `value || "—"` pintaría un guion y ocultaría que hay cero errores.
    render(<MetricCard label="Errores" value={0} />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("sin dato muestra un guion", () => {
    render(<MetricCard label="Errores" value={null} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("un texto se muestra tal cual", () => {
    render(<MetricCard label="Estado" value="ACTIVE" />);

    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });

  it("el hint es opcional y se muestra cuando se pasa", () => {
    render(<MetricCard label="Endpoints" value={3} hint="Últimas 24 h" />);

    expect(screen.getByText("Últimas 24 h")).toBeInTheDocument();
  });
});

describe("BusinessContextNote", () => {
  it("arranca colapsado: no roba espacio a la vista", () => {
    render(<BusinessContextNote>Esta vista muestra X.</BusinessContextNote>);

    expect(screen.queryByText("Esta vista muestra X.")).not.toBeInTheDocument();
    expect(screen.getByText("Ver")).toBeInTheDocument();
  });

  it("al abrir muestra la nota y cambia la etiqueta a 'Ocultar'", async () => {
    render(<BusinessContextNote>Esta vista muestra X.</BusinessContextNote>);

    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Esta vista muestra X.")).toBeInTheDocument();
    expect(screen.getByText("Ocultar")).toBeInTheDocument();
  });

  it("el segundo click vuelve a ocultar", async () => {
    render(<BusinessContextNote>Esta vista muestra X.</BusinessContextNote>);

    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("button"));

    expect(screen.queryByText("Esta vista muestra X.")).not.toBeInTheDocument();
  });
});
