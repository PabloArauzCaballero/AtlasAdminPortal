import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ViewExplainer } from "@/shared/components/layout/view-explainer";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock("next/navigation", () => ({ usePathname }));

function renderAt(pathname: string | null) {
  usePathname.mockReturnValue(pathname);
  return render(<ViewExplainer />);
}

const toggle = () => screen.getByRole("button");

describe("ViewExplainer · rutas sin explicación", () => {
  it("una ruta desconocida no renderiza nada (ni una cáscara vacía)", () => {
    const { container } = renderAt("/internal/ruta-que-no-existe");

    expect(container).toBeEmptyDOMElement();
  });

  it("una ruta fuera de /internal no renderiza nada", () => {
    const { container } = renderAt("/login");

    expect(container).toBeEmptyDOMElement();
  });

  it("sin pathname no revienta", () => {
    // `usePathname` puede devolver null fuera del árbol de app router.
    const { container } = renderAt(null);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("ViewExplainer · resolución de módulo", () => {
  it("nombra el módulo al que pertenece la ruta", () => {
    renderAt("/internal/systems/endpoints");

    expect(toggle()).toHaveTextContent("Systems Ops");
  });

  it("un prefijo alternativo del mismo módulo lo resuelve igual", () => {
    // "/internal/review-queue" no comparte raíz con "/internal/systems" pero es
    // el mismo módulo.
    renderAt("/internal/review-queue");

    expect(toggle()).toHaveTextContent("Systems Ops");
  });
});

describe("ViewExplainer · colapsado", () => {
  it("arranca colapsado y lo anuncia con aria-expanded", () => {
    renderAt("/internal/systems/endpoints");

    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("al abrir muestra ambos planos: negocio y sistemas", async () => {
    renderAt("/internal/systems/endpoints");

    await userEvent.click(toggle());

    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Explicación de negocio")).toBeInTheDocument();
    expect(screen.getByText("Explicación de sistemas")).toBeInTheDocument();
  });

  it("el segundo click vuelve a colapsar", async () => {
    renderAt("/internal/systems/endpoints");

    await userEvent.click(toggle());
    await userEvent.click(toggle());

    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("se colapsa al navegar a otra vista", async () => {
    const { rerender } = renderAt("/internal/systems/endpoints");
    await userEvent.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "true");

    usePathname.mockReturnValue("/internal/systems/tools");
    rerender(<ViewExplainer />);

    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });
});

describe("ViewExplainer · contenido", () => {
  it("muestra la explicación de módulo y la de la vista concreta", async () => {
    renderAt("/internal/systems/endpoints");

    await userEvent.click(toggle());

    expect(screen.getAllByText("Módulo:")).toHaveLength(2);
    expect(screen.getAllByText("Esta vista:")).toHaveLength(2);
  });

  it("gana el prefijo de vista más largo", async () => {
    // "/internal/systems/tools/health" matchea también "/internal/systems/tools";
    // debe ganar el específico o se explicaría la vista equivocada.
    renderAt("/internal/systems/tools/health");

    await userEvent.click(toggle());

    expect(
      screen.getByText(/¿está funcionando lo que la operación necesita/),
    ).toBeInTheDocument();
  });

  it("una ruta del módulo sin vista propia explica solo el módulo", async () => {
    renderAt("/internal/systems");

    await userEvent.click(toggle());

    expect(screen.getAllByText("Módulo:")).toHaveLength(2);
    expect(screen.queryByText("Esta vista:")).not.toBeInTheDocument();
  });
});
