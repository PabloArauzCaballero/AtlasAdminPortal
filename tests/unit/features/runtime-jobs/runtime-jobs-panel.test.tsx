import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { RuntimeJobsPanel } from "@/features/runtime-jobs/runtime-jobs-page";
import { RUNTIME_JOBS } from "@/features/runtime-jobs/runtime-job-catalog";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import { elegirOpcion } from "../../shared/option-select-helpers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));

const request = vi.mocked(apiRequest);
const filas = () => within(screen.getByRole("table")).getAllByRole("row");

describe("Jobs · Ejecutar ahora como tabla", () => {
  it("cada job es una fila con sus cabeceras, no una tarjeta con formulario", () => {
    renderWithProviders(<RuntimeJobsPanel />);
    const tabla = screen.getByRole("table");
    for (const cabecera of [
      "Job",
      "Para qué sirve",
      "Impacto",
      "Ensayo",
      "Parámetros",
      "Acciones",
    ]) {
      expect(
        within(tabla).getByRole("columnheader", { name: cabecera }),
      ).toBeInTheDocument();
    }
    expect(filas()).toHaveLength(RUNTIME_JOBS.length + 1);
    // Ningún formulario a la vista hasta pulsar «Ejecutar…».
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("el buscador y los filtros recortan las filas, y sin coincidencias lo dicen", async () => {
    renderWithProviders(<RuntimeJobsPanel />);
    fireEvent.change(screen.getByRole("textbox", { name: /Buscar job/ }), {
      target: { value: "purge-idempotency" },
    });
    await waitFor(() => expect(filas()).toHaveLength(2));
    fireEvent.change(screen.getByRole("textbox", { name: /Buscar job/ }), {
      target: { value: "" },
    });
    await waitFor(() => expect(filas()).toHaveLength(RUNTIME_JOBS.length + 1));
    const destructivos = RUNTIME_JOBS.filter((job) => job.destructive).length;
    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Impacto/ }),
      "destructive",
    );
    await waitFor(() => expect(filas()).toHaveLength(destructivos + 1));
    fireEvent.change(screen.getByRole("textbox", { name: /Buscar job/ }), {
      target: { value: "zzz" },
    });
    expect(
      await screen.findByText("Ningún job coincide con la búsqueda."),
    ).toBeInTheDocument();
  });

  it("Ejecutar… abre el formulario del job y un ensayo se manda sin confirmar", async () => {
    request.mockResolvedValue({
      jobRunId: "9",
      status: "completed",
      result: {},
    });
    const job = RUNTIME_JOBS.find(
      (each) => !each.destructive && each.supportsDryRun !== false,
    )!;
    renderWithProviders(<RuntimeJobsPanel />);
    const fila = within(screen.getByRole("table"))
      .getByText(job.title)
      .closest("tr") as HTMLElement;
    fireEvent.click(within(fila).getByRole("button", { name: "Ejecutar…" }));

    const panel = await screen.findByRole("dialog");
    expect(within(panel).getByText(job.business)).toBeInTheDocument();
    fireEvent.click(
      within(panel).getByRole("button", { name: "Ejecutar ensayo" }),
    );
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        expect.stringContaining("/"),
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({ dryRun: true }),
        }),
      ),
    );
  });
});
