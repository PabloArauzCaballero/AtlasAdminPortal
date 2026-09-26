import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import { capabilitiesFixture, templateFixture } from "./qa-runs-fixtures";

vi.setConfig({ testTimeout: 30000 });

const api = vi.hoisted(() => ({
  getQaCapabilities: vi.fn(),
  listQaTemplates: vi.fn(),
  getQaTemplate: vi.fn(),
  preflightQaRun: vi.fn(),
  launchQaRun: vi.fn(),
}));
vi.mock("@/features/qa-runs/run-api", () => api);

const { JourneysTab } = await import("@/features/qa-runs/journeys-tab");

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.getQaCapabilities.mockResolvedValue(capabilitiesFixture());
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

describe("JourneysTab · UI/contrato con respuestas simuladas del contrato QA", () => {
  it("abre con el catálogo precargado y el editor manual plegado", async () => {
    render_();

    expect(
      await screen.findByText("Alta de cuenta hasta el login"),
    ).toBeInTheDocument();
    expect(screen.queryByText("EDITOR MANUAL")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /Editor avanzado de pasos/ }),
    );
    expect(screen.getByText("EDITOR MANUAL")).toBeInTheDocument();
  });

  it("una plantilla bloqueada enseña su motivo y no ofrece ejecutar", async () => {
    render_();
    const card = await screen.findByTestId(
      "qa-template-customer_credit_decision",
    );

    expect(within(card).getByText("Bloqueada")).toBeInTheDocument();
    expect(
      within(card).getByText(/Falta el usuario interno de QA/),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("button", { name: /^Ejecutar$/ }),
    ).toBeDisabled();
  });

  it("Ejecutar abre el lanzamiento con esa plantilla y datos normales", async () => {
    render_();
    const card = await screen.findByTestId(
      "qa-template-account_signup_to_login",
    );
    await userEvent.click(
      within(card).getByRole("button", { name: /^Ejecutar$/ }),
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
