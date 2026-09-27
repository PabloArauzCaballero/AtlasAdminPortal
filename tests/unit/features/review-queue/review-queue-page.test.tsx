import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../helpers/render-with-providers";

vi.setConfig({ testTimeout: 30000 });

const services = vi.hoisted(() => ({
  listReviewQueue: vi.fn(),
  reviewCatalogTarget: vi.fn(),
}));
vi.mock("@/features/systems/services", () => services);
vi.mock("@/shared/auth/permission-gate", () => ({
  PermissionGate: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

const { ReviewQueuePage } =
  await import("@/features/review-queue/review-queue-page");

const empty = { items: [], total: 0 };

beforeEach(() => {
  Object.values(services).forEach((fn) => fn.mockReset());
  services.listReviewQueue.mockResolvedValue({
    endpoints: empty,
    dataEntities: empty,
    dataEntityImpacts: empty,
    fieldImpacts: empty,
    toolRequirements: empty,
    dataColumnImpacts: {
      total: 1,
      items: [
        {
          columnId: "77",
          dataEntityId: "12",
          schemaName: "core",
          tableName: "customers",
          columnName: "document_number",
          businessName: "Número de carnet",
          dataType: "varchar",
          containsPii: true,
          reviewStatus: "NEEDS_REVIEW",
        },
      ],
    },
  });
  services.reviewCatalogTarget.mockResolvedValue({});
});

async function columnRow() {
  const cell = await screen.findByText("core.customers.document_number");
  return cell.closest("tr") as HTMLElement;
}

describe("Cola de revisión · columnas (PATCH /systems/data-entities/columns/:id/review)", () => {
  it("pinta el cubo de columnas que el servidor ya devolvía", async () => {
    renderWithProviders(<ReviewQueuePage />);
    const row = await columnRow();
    expect(within(row).getByText("Número de carnet")).toBeInTheDocument();
    expect(screen.getByText("Columnas de datos")).toBeInTheDocument();
  });

  it("rechazar exige motivo y lo manda como notes", async () => {
    renderWithProviders(<ReviewQueuePage />);
    const row = await columnRow();
    await userEvent.click(
      within(row).getByRole("button", { name: "Rechazar" }),
    );

    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Rechazar" }),
    );
    expect(
      await within(dialog).findByText(/escribe el motivo/),
    ).toBeInTheDocument();
    expect(services.reviewCatalogTarget).not.toHaveBeenCalled();

    await userEvent.type(
      within(dialog).getByRole("textbox"),
      "No es dato personal: es un código interno.",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Rechazar" }),
    );

    await vi.waitFor(() =>
      expect(services.reviewCatalogTarget).toHaveBeenCalledWith(
        "column",
        "77",
        {
          reviewStatus: "REJECTED",
          confidenceLevel: "MEDIUM",
          notes: "No es dato personal: es un código interno.",
        },
      ),
    );
  });

  it("aprobar sin motivo no manda notes vacías", async () => {
    renderWithProviders(<ReviewQueuePage />);
    const row = await columnRow();
    await userEvent.click(within(row).getByRole("button", { name: "Aprobar" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Aprobar" }),
    );

    await vi.waitFor(() =>
      expect(services.reviewCatalogTarget).toHaveBeenCalledWith(
        "column",
        "77",
        {
          reviewStatus: "APPROVED",
          confidenceLevel: "HIGH",
        },
      ),
    );
  });
});
