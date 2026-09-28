import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { ConsentDocumentsPage } from "@/features/consent-documents/consent-documents-page";
import type { ConsentDocument } from "@/features/consent-documents/types";
import { renderWithProviders } from "../../helpers/render-with-providers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));

const request = vi.mocked(apiRequest);
const document: ConsentDocument = {
  id: "document-1",
  documentCode: "privacy_policy",
  versionCode: "v1",
  language: "es",
  title: "Política de privacidad",
  summary: "Qué guardamos y para qué.",
  bodyMarkdown: "Texto vigente.",
  contentUrl: null,
  requiresExplicitAction: true,
  effectiveFrom: "2026-09-01",
  effectiveUntil: null,
  status: "published",
};

async function openEditor() {
  await screen.findByText("Política de privacidad");
  fireEvent.click(screen.getByTestId("edit-privacy_policy"));
  fireEvent.change(screen.getByTestId("title-privacy_policy"), {
    target: { value: "Política actualizada" },
  });
  fireEvent.click(screen.getByTestId("save-privacy_policy"));
}

describe("ConsentDocumentsPage", () => {
  beforeEach(() => request.mockReset());

  it("conserva el borrador y el texto vigente si el servidor rechaza la edición", async () => {
    request.mockImplementation((path, options) =>
      options?.method === "PATCH"
        ? Promise.reject(new Error("Conflicto de versión"))
        : Promise.resolve({ items: [document] }),
    );
    renderWithProviders(<ConsentDocumentsPage />);

    await openEditor();

    expect(await screen.findByText(/No pudimos guardar/)).toBeInTheDocument();
    expect(screen.getByText("Política de privacidad")).toBeInTheDocument();
    expect(screen.getByTestId("title-privacy_policy")).toHaveValue(
      "Política actualizada",
    );
  });

  it("refresca el texto visible solo después de que el servidor confirma la edición", async () => {
    let vigente = document;
    request.mockImplementation((path, options) => {
      if (options?.method === "PATCH") {
        vigente = { ...vigente, title: "Política actualizada" };
        return Promise.resolve({});
      }
      return Promise.resolve({ items: [vigente] });
    });
    renderWithProviders(<ConsentDocumentsPage />);

    await openEditor();

    await waitFor(() =>
      expect(screen.getByText("Política actualizada")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("edit-privacy_policy")).toBeInTheDocument();
  });
});
