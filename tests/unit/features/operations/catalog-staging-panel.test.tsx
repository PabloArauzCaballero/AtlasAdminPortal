import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";
import { renderWithProviders } from "../../../helpers/render-with-providers";

vi.setConfig({ testTimeout: 30000 });

const api = vi.hoisted(() => ({
  listStagingItems: vi.fn(),
  decideStagingItems: vi.fn(),
}));
vi.mock("@/features/operations/catalog-staging-services", () => api);

const { CatalogStagingPanel } =
  await import("@/features/operations/catalog-staging-panel");

const DRAFT = {
  catalogVersionId: "9",
  versionCode: "v2",
  status: "draft",
  validFrom: null,
  validUntil: null,
};

function item(id: string, overrides: Record<string, unknown> = {}) {
  return {
    stagingItemId: id,
    catalogId: "3",
    ingestionJobId: "41",
    proposedItemCode: `BANCO_${id}`,
    proposedItemName: `Banco ${id}`,
    proposedAttributes: {},
    aiSuggested: false,
    reviewStatus: "pending_review",
    reviewNotes: null,
    ...overrides,
  };
}

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.listStagingItems.mockResolvedValue({
    items: [item("1"), item("2"), item("3", { proposedItemCode: null })],
    total: 3,
    page: 1,
    pageSize: 50,
  });
});

async function select(name: string) {
  await userEvent.click(
    await screen.findByRole("checkbox", { name: `Seleccionar ${name}` }),
  );
}

describe("CatalogStagingPanel · GET /operations/catalog-staging-items + decision-batch", () => {
  it("tras ingerir pide los pendientes de ESA ingesta", async () => {
    renderWithProviders(
      <CatalogStagingPanel
        catalogCode="bancos"
        ingestionJobId="41"
        currentVersion={DRAFT}
      />,
    );
    expect(await screen.findByText("Banco 1")).toBeInTheDocument();
    expect(api.listStagingItems).toHaveBeenCalledWith({
      catalogCode: "bancos",
      reviewStatus: "pending_review",
      ingestionJobId: "41",
      page: 1,
      pageSize: 50,
    });
  });

  it("aprueba en lote con motivo, clave de idempotencia y resultado por ítem", async () => {
    api.decideStagingItems.mockResolvedValue({
      processed: 2,
      approved: 2,
      rejected: 0,
      itemsCreated: 2,
    });
    renderWithProviders(
      <CatalogStagingPanel catalogCode="bancos" currentVersion={DRAFT} />,
    );
    await select("Banco 1");
    await select("Banco 2");
    await userEvent.click(
      screen.getByRole("button", { name: "Aprobar seleccionados (2)" }),
    );
    const dialog = await screen.findByRole("dialog");

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Aprobar lote" }),
    );
    expect(within(dialog).getByText(/Escribe el motivo/)).toBeInTheDocument();
    expect(api.decideStagingItems).not.toHaveBeenCalled();

    await userEvent.type(
      within(dialog).getByRole("textbox"),
      "Verificados contra el padrón ASFI.",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Aprobar lote" }),
    );

    expect(
      await within(dialog).findByText(/2 aprobados, 0 rechazados/),
    ).toBeInTheDocument();
    expect(
      within(dialog).getAllByText("Aprobado: entra en la versión"),
    ).toHaveLength(2);
    const [body, key] = api.decideStagingItems.mock.calls[0];
    expect(body).toEqual({
      targetCatalogVersionId: "9",
      decisions: [
        {
          stagingItemId: "1",
          decision: "approve",
          decisionReason: "Verificados contra el padrón ASFI.",
        },
        {
          stagingItemId: "2",
          decision: "approve",
          decisionReason: "Verificados contra el padrón ASFI.",
        },
      ],
    });
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThanOrEqual(8);
  });

  it("no deja aprobar un ítem sin código propuesto", async () => {
    renderWithProviders(
      <CatalogStagingPanel catalogCode="bancos" currentVersion={DRAFT} />,
    );
    await select("Banco 3");
    await userEvent.click(
      screen.getByRole("button", { name: "Aprobar seleccionados (1)" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      /no se puede aprobar/,
    );
    expect(
      within(dialog).getByRole("button", { name: "Aprobar lote" }),
    ).toBeDisabled();
  });

  it("si el lote falla no se aplica ninguno y lo dice ítem por ítem", async () => {
    api.decideStagingItems.mockRejectedValue(
      new AtlasApiError({
        status: 422,
        code: "TARGET_VERSION_NOT_EDITABLE",
        message: "TARGET_VERSION_NOT_EDITABLE",
      }),
    );
    renderWithProviders(
      <CatalogStagingPanel catalogCode="bancos" currentVersion={DRAFT} />,
    );
    await select("Banco 1");
    await userEvent.click(
      screen.getByRole("button", { name: "Rechazar seleccionados (1)" }),
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(
      within(dialog).getByRole("textbox"),
      "Duplicado de otro banco.",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Rechazar lote" }),
    );

    expect(
      await within(dialog).findByText("No se aplicó ninguna decisión"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Sin cambios")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Reintentar" }),
    ).toBeInTheDocument();
  });

  it("sin versión editable explica qué hacer y no ofrece decidir", async () => {
    renderWithProviders(
      <CatalogStagingPanel
        catalogCode="bancos"
        currentVersion={{ ...DRAFT, status: "published" }}
      />,
    );
    await select("Banco 1");
    expect(screen.getByText(/ya no se puede editar/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Aprobar seleccionados (1)" }),
    ).toBeDisabled();
  });
});
