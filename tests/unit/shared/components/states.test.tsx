import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { renderWithProviders } from "../../../helpers/render-with-providers";

describe("LoadingSkeleton", () => {
  it("se anuncia como cargando para lectores de pantalla", () => {
    renderWithProviders(<LoadingSkeleton />);
    expect(screen.getByLabelText("Cargando")).toBeInTheDocument();
  });

  it("renderiza la cantidad de filas pedida", () => {
    const { container } = renderWithProviders(<LoadingSkeleton rows={3} />);
    expect(container.querySelectorAll(".animate-shimmer")).toHaveLength(3);
  });
});

describe("EmptyState", () => {
  it("muestra el título", () => {
    renderWithProviders(<EmptyState title="Sin resultados" />);
    expect(
      screen.getByRole("heading", { name: "Sin resultados" }),
    ).toBeInTheDocument();
  });

  it("muestra la descripción cuando se pasa", () => {
    renderWithProviders(
      <EmptyState title="Sin resultados" description="Ajusta los filtros." />,
    );
    expect(screen.getByText("Ajusta los filtros.")).toBeInTheDocument();
  });

  it("renderiza la acción opcional", () => {
    renderWithProviders(
      <EmptyState title="Sin resultados" action={<button>Crear</button>} />,
    );
    expect(screen.getByRole("button", { name: "Crear" })).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("usa un título por defecto", () => {
    renderWithProviders(<ErrorState />);
    expect(
      screen.getByRole("heading", {
        name: "No se pudo cargar la información.",
      }),
    ).toBeInTheDocument();
  });

  it("muestra el requestId para poder correlacionar el fallo", () => {
    renderWithProviders(<ErrorState requestId="req_abc123" />);
    expect(screen.getByText(/req_abc123/)).toBeInTheDocument();
  });

  it("no muestra la línea de Request ID si no hay requestId", () => {
    renderWithProviders(<ErrorState />);
    expect(screen.queryByText(/Request ID/)).not.toBeInTheDocument();
  });

  it("no muestra el botón de reintentar si no hay onRetry", () => {
    renderWithProviders(<ErrorState />);
    expect(
      screen.queryByRole("button", { name: "Reintentar" }),
    ).not.toBeInTheDocument();
  });

  it("invoca onRetry al pulsar Reintentar", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<ErrorState onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("ForbiddenState", () => {
  it("muestra el encabezado de acceso restringido", () => {
    renderWithProviders(<ForbiddenState />);
    expect(
      screen.getByRole("heading", { name: "Acceso restringido" }),
    ).toBeInTheDocument();
  });

  it("usa un mensaje por defecto", () => {
    renderWithProviders(<ForbiddenState />);
    expect(
      screen.getByText("No tienes permisos para ver esta sección."),
    ).toBeInTheDocument();
  });

  it("permite personalizar el mensaje", () => {
    renderWithProviders(<ForbiddenState message="Solo para auditores." />);
    expect(screen.getByText("Solo para auditores.")).toBeInTheDocument();
  });
});
