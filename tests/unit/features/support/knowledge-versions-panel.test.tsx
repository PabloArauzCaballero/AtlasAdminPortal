import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
vi.mock("@/shared/api/client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

import { KnowledgeVersionsPanel } from "@/features/support/knowledge-versions-panel";
import { AtlasApiError } from "@/shared/api/errors";
import { renderWithProviders } from "../../../helpers/render-with-providers";

beforeEach(() => {
  apiRequest.mockReset();
});

const borrador = {
  versionId: "42",
  articleId: "7",
  articleKey: "no-me-llega-el-codigo",
  title: "No me llega el código",
  status: "DRAFT" as const,
  updatedAt: "2026-09-26T10:00:00.000Z",
};

describe("KnowledgeVersionsPanel", () => {
  it("un borrador ofrece enviarlo a revisión y registra el estado que devuelve el servidor", async () => {
    apiRequest.mockResolvedValue({ versionId: "42", status: "IN_REVIEW" });
    const onRegistrar = vi.fn();
    renderWithProviders(
      <KnowledgeVersionsPanel
        versiones={[borrador]}
        onRegistrar={onRegistrar}
        onOlvidar={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: "Enviar a revisión" })[0],
    );
    const panel = await screen.findByRole("dialog");
    fireEvent.click(
      within(panel).getByRole("button", { name: "Enviar a revisión" }),
    );

    await waitFor(() => expect(onRegistrar).toHaveBeenCalled());
    expect(apiRequest.mock.calls[0][0]).toBe(
      "/admin/support/knowledge/versions/42/submit-review",
    );
    expect(onRegistrar.mock.calls[0][0]).toMatchObject({
      versionId: "42",
      status: "IN_REVIEW",
      articleKey: "no-me-llega-el-codigo",
    });
  });

  /** Quien aprueba no tiene la versión en su lista: la abre por el número que le pasaron. */
  it("aprobar por número explica el rechazo por autoaprobación", async () => {
    apiRequest.mockRejectedValue(
      new AtlasApiError({
        status: 403,
        code: "KNOWLEDGE_SELF_APPROVAL_FORBIDDEN",
        message: "Quien redactó una versión no puede aprobarla.",
      }),
    );
    renderWithProviders(
      <KnowledgeVersionsPanel
        versiones={[]}
        onRegistrar={vi.fn()}
        onOlvidar={vi.fn()}
      />,
    );

    expect(
      screen.getByText("No hay versiones en curso en este navegador."),
    ).toBeInTheDocument();
    const aprobar = screen.getAllByRole("button", { name: "Aprobar" })[0];
    expect(aprobar).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Número de versión"), {
      target: { value: "42" },
    });
    fireEvent.click(aprobar);
    const panel = await screen.findByRole("dialog");
    fireEvent.click(within(panel).getByRole("button", { name: "Aprobar" }));

    expect(
      await within(panel).findByText(
        /Pásale el número de versión a otra persona/,
      ),
    ).toBeInTheDocument();
    expect(apiRequest.mock.calls[0][0]).toBe(
      "/admin/support/knowledge/versions/42/approve",
    );
  });
});
