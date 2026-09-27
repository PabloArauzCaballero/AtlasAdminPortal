import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
vi.mock("@/shared/api/client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({ user: { id: "5" } }),
}));

import { KnowledgeVersionsPanel } from "@/features/support/knowledge-versions-panel";
import { isOwnVersion } from "@/features/support/knowledge-types";
import { renderWithProviders } from "../../../helpers/render-with-providers";

function version(versionId: string, autor: number | string) {
  return {
    versionId,
    articleId: "7",
    versionNumber: 2,
    locale: "es-BO",
    status: "IN_REVIEW",
    title: `Versión ${versionId}`,
    question: null,
    shortAnswer: null,
    createdByInternalUserId: autor,
    reviewedByInternalUserId: null,
    approvedByInternalUserId: null,
    approvedAt: null,
    publishedAt: null,
    retiredAt: null,
    changeReason: "Aclarar el plazo",
    updatedAt: "2026-09-26T10:00:00.000Z",
  };
}

/** Responde por ruta, como el servidor: la cola y la ficha con el texto completo. */
function servidor(cola: unknown[]) {
  apiRequest.mockImplementation((ruta: string) => {
    if (ruta === "/admin/support/knowledge/versions")
      return Promise.resolve({
        items: cola,
        total: cola.length,
        page: 1,
        pageSize: 20,
      });
    if (ruta === "/admin/support/knowledge/versions/42")
      return Promise.resolve({
        ...version("42", 9),
        bodyMarkdown: "Paso 1: revisa que el número esté bien escrito.",
        tags: [],
        escalateWhen: "Si tras tres intentos no llega.",
      });
    if (ruta.endsWith("/approve"))
      return Promise.resolve({ versionId: "42", status: "APPROVED" });
    return Promise.reject(new Error(`ruta inesperada ${ruta}`));
  });
}

beforeEach(() => {
  apiRequest.mockReset();
});

describe("KnowledgeVersionsPanel", () => {
  it("pide al servidor la cola de las que esperan aprobación", async () => {
    servidor([]);
    renderWithProviders(<KnowledgeVersionsPanel />);
    expect(
      await screen.findByText("No hay versiones en esta cola."),
    ).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith(
      "/admin/support/knowledge/versions",
      { query: { status: "IN_REVIEW", page: 1, pageSize: 20 } },
    );
  });

  it("no ofrece aprobar la versión que redactó quien mira", async () => {
    servidor([version("41", 5)]);
    renderWithProviders(<KnowledgeVersionsPanel />);
    expect(
      (await screen.findAllByText("La redactaste tú")).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Aprobar" })).toBeNull();
  });

  it("quien aprueba lee el texto completo antes de aprobar", async () => {
    servidor([version("42", 9)]);
    renderWithProviders(<KnowledgeVersionsPanel />);

    fireEvent.click(
      (await screen.findAllByRole("button", { name: "Aprobar" }))[0],
    );
    const panel = await screen.findByRole("dialog");
    expect(
      await within(panel).findByText(/Paso 1: revisa que el número/),
    ).toBeInTheDocument();
    expect(within(panel).getByText(/tres intentos/)).toBeInTheDocument();

    const aprobar = within(panel).getByRole("button", { name: "Aprobar" });
    await waitFor(() => expect(aprobar).toBeEnabled());
    fireEvent.click(aprobar);
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(
        "/admin/support/knowledge/versions/42/approve",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });
});

describe("isOwnVersion", () => {
  it("compara el autor como texto: el servidor puede mandarlo como número", () => {
    expect(isOwnVersion({ createdByInternalUserId: 5 }, "5")).toBe(true);
    expect(isOwnVersion({ createdByInternalUserId: "6" }, "5")).toBe(false);
    expect(isOwnVersion({ createdByInternalUserId: null }, "5")).toBe(false);
    expect(isOwnVersion({ createdByInternalUserId: 5 }, undefined)).toBe(false);
  });
});
