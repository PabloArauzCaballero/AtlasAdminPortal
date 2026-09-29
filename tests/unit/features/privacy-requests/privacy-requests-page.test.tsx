import { HttpResponse, http } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/** Solicitudes de privacidad (P2, 2026-09-29): el buscador sólo aceptaba el id numérico del cliente. */
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    permissions: ["privacy.requests.read", "privacy.requests.manage"],
    hasAnyPermission: () => true,
    hasPermission: () => true,
    hasAnyRole: () => true,
  }),
}));

const { PrivacyRequestsPage } =
  await import("@/features/privacy-requests/privacy-requests-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const pedidas: URLSearchParams[] = [];

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
beforeEach(() => {
  pedidas.length = 0;
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(
      `${API_BASE}/operations/privacy/data-subject-requests`,
      ({ request }) => {
        pedidas.push(new URL(request.url).searchParams);
        return HttpResponse.json({
          data: {
            items: [],
            meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
            summary: { open: 3, overdue: 1, dueDays: 15 },
          },
        });
      },
    ),
  );
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

describe("PrivacyRequestsPage · buscador", () => {
  it("manda `q` con el texto tal cual (código de solicitud o de cliente), no un id sólo de dígitos", async () => {
    renderWithProviders(<PrivacyRequestsPage />);
    await userEvent.type(
      await screen.findByRole("textbox", {
        name: /código de solicitud o de cliente/i,
      }),
      "CUS-9",
    );
    await waitFor(() => expect(pedidas.at(-1)?.get("q")).toBe("CUS-9"));
    expect(pedidas.at(-1)?.get("customerId")).toBeNull();
    expect(pedidas.at(-1)?.get("page")).toBe("1");
  });
});
