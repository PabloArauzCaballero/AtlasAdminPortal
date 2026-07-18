import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/shared/components/ui/button";

describe("Button · comportamiento base", () => {
  it("es type=button por defecto (no envía el formulario que lo contiene)", () => {
    // Un botón sin type dentro de un <form> hace submit por defecto: un botón
    // de "Ver detalle" recargaría la página.
    render(<Button>Ver detalle</Button>);

    expect(screen.getByRole("button", { name: "Ver detalle" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("permite forzar type=submit", () => {
    render(<Button type="submit">Guardar</Button>);

    expect(screen.getByRole("button", { name: "Guardar" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("dispara onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Ir</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Ir" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("deshabilitado no dispara onClick", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Ir
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Ir" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Button · isLoading", () => {
  it("mientras carga se deshabilita: evita el doble submit", async () => {
    const onClick = vi.fn();
    render(
      <Button isLoading onClick={onClick}>
        Aprobar
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Aprobar" }));

    expect(screen.getByRole("button", { name: "Aprobar" })).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("anuncia la carga con aria-busy", () => {
    render(<Button isLoading>Aprobar</Button>);

    expect(screen.getByRole("button", { name: "Aprobar" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("sin cargar, aria-busy es false", () => {
    render(<Button>Aprobar</Button>);

    expect(screen.getByRole("button", { name: "Aprobar" })).toHaveAttribute(
      "aria-busy",
      "false",
    );
  });

  it("loadingText reemplaza la etiqueta mientras carga", () => {
    render(
      <Button isLoading loadingText="Aprobando…">
        Aprobar
      </Button>,
    );

    expect(
      screen.getByRole("button", { name: "Aprobando…" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Aprobar")).not.toBeInTheDocument();
  });

  it("sin loadingText mantiene la etiqueta original", () => {
    render(<Button isLoading>Aprobar</Button>);

    expect(screen.getByRole("button", { name: "Aprobar" })).toBeInTheDocument();
  });

  it("un botón ya deshabilitado sigue deshabilitado sin isLoading", () => {
    render(
      <Button disabled isLoading={false}>
        Aprobar
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Aprobar" })).toBeDisabled();
  });
});

describe("Button · variantes", () => {
  it("cada variante se ve distinta", () => {
    // `danger` debe poder distinguirse de `primary`: es la señal de que la
    // acción destruye algo.
    const variants = ["primary", "secondary", "ghost", "danger"] as const;
    const clases = variants.map((variant) => {
      const { unmount } = render(<Button variant={variant}>X</Button>);
      const className = screen.getByRole("button", { name: "X" }).className;
      unmount();
      return className;
    });

    expect(new Set(clases).size).toBe(variants.length);
  });

  it("reenvía atributos nativos como aria-label", () => {
    render(<Button aria-label="Cerrar panel">×</Button>);

    expect(
      screen.getByRole("button", { name: "Cerrar panel" }),
    ).toBeInTheDocument();
  });
});
