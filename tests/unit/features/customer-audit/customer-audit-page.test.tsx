import { HttpResponse, http } from "msw";
import { screen, waitFor } from "@testing-library/react";
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

/**
 * Auditoría del cliente (§5, 2026-09-29): el portal seguía llamando a la ruta DEPRECADA por offset
 * (`GET /operations/audit/customer/:id`), que pagina en memoria y da totales aproximados.
 */
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({ permissions: ["audit.events.read"] }),
}));

const { CustomerAuditPage } =
  await import("@/features/customer-audit/customer-audit-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const rutas: string[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
  server.events.on("request:start", ({ request }) => {
    rutas.push(new URL(request.url).pathname.replace("/api/v1", ""));
  });
});
beforeEach(() => {
  rutas.length = 0;
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(`${API_BASE}/operations/audit/customer/9/feed`, () =>
      HttpResponse.json({ data: { items: [], nextCursor: null } }),
    ),
  );
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

describe("CustomerAuditPage", () => {
  it("lee sólo el feed por cursor y nunca la ruta deprecada", async () => {
    renderWithProviders(<CustomerAuditPage customerId="9" />);
    await waitFor(() =>
      expect(rutas).toContain("/operations/audit/customer/9/feed"),
    );
    expect(rutas).not.toContain("/operations/audit/customer/9");
    expect(screen.queryByText(/deprecad/i)).toBeNull();
  });
});
