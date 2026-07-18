import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RouteError from "@/app/error";
import NotFound from "@/app/not-found";
import { AtlasApiError } from "@/shared/api/errors";

describe("RouteError (boundary de segmento)", () => {
  it("muestra un estado de error genérico y el botón de reintentar", () => {
    render(<RouteError error={new Error("boom")} reset={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Reintentar" }),
    ).toBeInTheDocument();
  });

  it("invoca reset al pulsar Reintentar", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<RouteError error={new Error("boom")} reset={reset} />);

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(reset).toHaveBeenCalledOnce();
  });

  it("ante un 403 muestra acceso restringido, no el error genérico", () => {
    const error = new AtlasApiError({
      status: 403,
      code: "FORBIDDEN",
      message: "No.",
    });
    render(<RouteError error={error} reset={() => {}} />);

    expect(
      screen.getByRole("heading", { name: "Acceso restringido" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reintentar" }),
    ).not.toBeInTheDocument();
  });

  it("expone el requestId de un AtlasApiError para soporte", () => {
    const error = new AtlasApiError({
      status: 500,
      code: "INTERNAL",
      message: "Falló.",
      requestId: "req_err_1",
    });
    render(<RouteError error={error} reset={() => {}} />);

    expect(screen.getByText(/req_err_1/)).toBeInTheDocument();
  });

  it("usa el digest como referencia cuando no hay AtlasApiError", () => {
    const error = Object.assign(new Error("boom"), { digest: "dig_123" });
    render(<RouteError error={error} reset={() => {}} />);

    expect(screen.getByText(/dig_123/)).toBeInTheDocument();
  });
});

describe("NotFound (404)", () => {
  it("muestra el código 404 y el título", () => {
    render(<NotFound />);
    expect(screen.getByText("ERROR 404")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "No encontramos esta página" }),
    ).toBeInTheDocument();
  });

  it("ofrece un enlace de vuelta al portal interno", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", { name: "Volver al portal" });
    expect(link).toHaveAttribute("href", "/internal");
  });
});
