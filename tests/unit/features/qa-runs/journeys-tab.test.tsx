import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import { elegirOpcion } from "../../shared/option-select-helpers";
import { capabilitiesFixture, templateFixture } from "./qa-runs-fixtures";

vi.setConfig({ testTimeout: 30000 });

const api = vi.hoisted(() => ({
  getQaCapabilities: vi.fn(),
  listQaTemplates: vi.fn(),
  getQaTemplate: vi.fn(),
  preflightQaRun: vi.fn(),
  launchQaRun: vi.fn(),
  listQaCampaigns: vi.fn(),
}));
vi.mock("@/features/qa-runs/run-api", () => api);

const { JourneysTab } = await import("@/features/qa-runs/journeys-tab");

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.getQaCapabilities.mockResolvedValue(capabilitiesFixture());
  api.listQaCampaigns.mockResolvedValue([
    {
      code: "regression_normal",
      name: "Regresión normal",
      description: "Recorridos del cliente con datos normales.",
      templates: [
        { code: "account_signup_to_login", version: "1.0.0", share: 1 },
        { code: "customer_credit_decision", version: "1.1.0", share: 3 },
      ],
    },
  ]);
  api.listQaTemplates.mockResolvedValue([
    templateFixture(),
    templateFixture({
      code: "customer_credit_decision",
      name: "Decisión de crédito",
      status: "BLOCKED",
      blockedReasons: ["Falta el usuario interno de QA para la revisión."],
    }),
  ]);
});

function render_() {
  return renderWithProviders(
    <JourneysTab
      runId={null}
      onRunIdChange={vi.fn()}
      advancedEditor={<p>EDITOR MANUAL</p>}
    />,
  );
}

/** La fila (`tr`) de un recorrido o campaña: el testid vive en su primera celda. */
function rowOf(testId: string): HTMLElement {
  const row = screen.getByTestId(testId).closest("tr");
  if (!row) throw new Error(`«${testId}» no está dentro de una fila de tabla`);
  return row;
}

describe("JourneysTab · UI/contrato con respuestas simuladas del contrato QA", () => {
  it("abre con el catálogo precargado como tabla y el editor manual plegado", async () => {
    render_();

    await screen.findByTestId("qa-template-account_signup_to_login");
    const table = screen.getAllByRole("table")[0];
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers).toEqual([
      "Recorrido",
      "Estado",
      "Alcance",
      "Actúan",
      "Desenlace",
      "Datos",
      "Acciones",
    ]);
    const row = rowOf("qa-template-account_signup_to_login");
    expect(
      within(row).getByText("Alta de cuenta hasta el login"),
    ).toBeInTheDocument();
    expect(within(row).getByText("Lista")).toBeInTheDocument();
    expect(screen.queryByText("EDITOR MANUAL")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /Editor avanzado de pasos/ }),
    );
    expect(screen.getByText("EDITOR MANUAL")).toBeInTheDocument();
  });

  it("el buscador del catálogo recorta las filas por nombre, código o descripción", async () => {
    render_();
    await screen.findByTestId("qa-template-account_signup_to_login");
    expect(
      screen.getByTestId("qa-template-customer_credit_decision"),
    ).toBeInTheDocument();

    await userEvent.type(
      screen.getByLabelText("Buscar por nombre, código o descripción…"),
      "crédito",
    );
    await waitFor(() =>
      expect(
        screen.queryByTestId("qa-template-account_signup_to_login"),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByTestId("qa-template-customer_credit_decision"),
    ).toBeInTheDocument();

    await userEvent.clear(
      screen.getByLabelText("Buscar por nombre, código o descripción…"),
    );
    await userEvent.type(
      screen.getByLabelText("Buscar por nombre, código o descripción…"),
      "zzz-nada",
    );
    expect(
      await screen.findByText("Ningún recorrido coincide con la búsqueda."),
    ).toBeInTheDocument();
  });

  it("el filtro de estado deja sólo las recetas bloqueadas", async () => {
    render_();
    await screen.findByTestId("qa-template-account_signup_to_login");

    await elegirOpcion(
      screen.getByRole("combobox", { name: "Estado" }),
      "BLOCKED",
    );
    await waitFor(() =>
      expect(
        screen.queryByTestId("qa-template-account_signup_to_login"),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByTestId("qa-template-customer_credit_decision"),
    ).toBeInTheDocument();
  });

  it("un catálogo vacío dice que no hay recorridos, no que nada coincide", async () => {
    api.listQaTemplates.mockResolvedValue([]);
    render_();
    expect(
      await screen.findByText("Sin recorridos precargados"),
    ).toBeInTheDocument();
  });

  it("si el catálogo falla, muestra el error con «Reintentar»", async () => {
    api.listQaTemplates.mockRejectedValueOnce(new Error("caído"));
    render_();
    expect(
      await screen.findByText("No se pudo leer el catálogo de recorridos"),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getAllByRole("button", { name: /Reintentar/ })[0],
    );
    expect(
      await screen.findByTestId("qa-template-account_signup_to_login"),
    ).toBeInTheDocument();
  });

  it("enseña las campañas como tabla con el nombre del recorrido y su reparto de personas", async () => {
    render_();
    await screen.findByTestId("qa-campaign-regression_normal");
    const campaign = rowOf("qa-campaign-regression_normal");

    expect(within(campaign).getByText("Regresión normal")).toBeInTheDocument();
    expect(
      await within(campaign).findByText(/Alta de cuenta hasta el login/),
    ).toBeInTheDocument();
    expect(
      within(campaign).getByText("25 % de las personas"),
    ).toBeInTheDocument();
    expect(
      within(campaign).getByText("75 % de las personas"),
    ).toBeInTheDocument();
    expect(api.listQaCampaigns).toHaveBeenCalledTimes(1);
  });

  it("el buscador de campañas encuentra por el nombre de uno de sus recorridos", async () => {
    render_();
    await screen.findByTestId("qa-campaign-regression_normal");
    await userEvent.type(
      screen.getByLabelText("Buscar campaña o recorrido…"),
      "zzz-nada",
    );
    expect(
      await screen.findByText("Ninguna campaña coincide con la búsqueda."),
    ).toBeInTheDocument();
  });

  it("una plantilla bloqueada enseña su motivo y no ofrece ejecutar", async () => {
    render_();
    await screen.findByTestId("qa-template-customer_credit_decision");
    const row = rowOf("qa-template-customer_credit_decision");

    expect(within(row).getByText("Bloqueada")).toBeInTheDocument();
    expect(
      within(row).getByText(/Falta el usuario interno de QA/),
    ).toBeInTheDocument();
    expect(
      within(row).getByRole("button", { name: /^Ejecutar$/ }),
    ).toBeDisabled();
  });

  it("Ejecutar abre el lanzamiento con esa plantilla y datos normales", async () => {
    render_();
    await screen.findByTestId("qa-template-account_signup_to_login");
    const row = rowOf("qa-template-account_signup_to_login");
    await userEvent.click(
      within(row).getByRole("button", { name: /^Ejecutar$/ }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByRole("combobox", {
        name: /Plantilla de recorrido/,
      }),
    ).toHaveTextContent("Alta de cuenta hasta el login");
    expect(
      within(dialog).getByRole("combobox", { name: /^Datos/ }),
    ).toHaveTextContent("Normales");
  });
});
