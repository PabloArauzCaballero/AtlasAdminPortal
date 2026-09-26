import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JobActions } from "@/features/operational-jobs/job-actions";

/**
 * Los botones que prometían reintentar o cancelar una corrida llamaban a rutas que AtlasBackend
 * retiró a propósito (devolvían 200 sin hacer nada; luego 404). Esta prueba fija que no vuelvan:
 * una acción que no ocurre no puede estar en pantalla.
 */
describe("JobActions", () => {
  it("no ofrece reintentar ni cancelar: la corrida es un hecho y el job se dispara de nuevo", () => {
    render(<JobActions jobRunId="run-1" />);
    expect(
      screen.queryByRole("button", { name: /reintentar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cancelar/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("job-actions-note")).toHaveTextContent(
      /se dispara el job de nuevo/i,
    );
  });
});
