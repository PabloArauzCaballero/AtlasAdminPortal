import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { SegmentsSection } from "@/features/notification-campaigns/segments-section";
import { renderWithProviders } from "../../../helpers/render-with-providers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    permissions: [],
    roles: [],
    hasPermission: () => true,
    hasAnyRole: () => true,
  }),
}));

const request = vi.mocked(apiRequest);
const consultas: Array<Record<string, unknown>> = [];

beforeEach(() => {
  consultas.length = 0;
  request.mockReset();
  request.mockImplementation(async (_path, options) => {
    const query = (options?.query ?? {}) as Record<string, unknown>;
    consultas.push(query);
    return {
      data: query.q
        ? []
        : [
            {
              id: "1",
              name: "Comercios de Sucre",
              description: null,
              definition: null,
              lastEstimate: null,
              lastEstimatedAt: null,
              status: "active",
              createdBy: null,
              createdAt: "2026-09-01T00:00:00Z",
              updatedAt: "2026-09-01T00:00:00Z",
            },
          ],
    };
  });
});

describe("Segmentos de audiencia", () => {
  it("el buscador viaja como q junto al estado, y sin coincidencias lo dice", async () => {
    renderWithProviders(<SegmentsSection />);
    await screen.findByText("Comercios de Sucre");
    expect(consultas.at(-1)).toEqual({ status: "active" });
    fireEvent.change(
      screen.getByRole("textbox", { name: /nombre o descripción/i }),
      { target: { value: "cobranza" } },
    );
    await waitFor(() =>
      expect(consultas.at(-1)).toEqual({ status: "active", q: "cobranza" }),
    );
    expect(
      await screen.findByText("Ningún segmento coincide con la búsqueda."),
    ).toBeInTheDocument();
  });
});
