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
import { CAMPAIGN, PAGINATION } from "./fixtures";

const { CampaignsPage } =
  await import("@/features/notification-campaigns/campaigns-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");
const { AuthProvider } = await import("@/shared/auth/auth-context");
const { setStoredInternalSession } =
  await import("@/shared/auth/session-storage");
const { makeSession, makeUser } =
  await import("../../../helpers/session-fixtures");

/**
 * El listado de campañas del portal admin (D-6: observar y frenar; el ERP crea).
 *
 * Se fija: pide la ruta real de campañas; enseña el estado en palabras; a quien el servidor no deja
 * leer no le dispara la petición; y no ofrece ninguna acción de creación.
 */
let pedidas: URL[] = [];

function render(legacyRoles: string[] = ["internal_operator"]) {
  setStoredInternalSession(
    makeSession({ user: makeUser({ roles: ["OPERATOR"], legacyRoles }) }),
  );
  return renderWithProviders(
    <AuthProvider>
      <CampaignsPage />
    </AuthProvider>,
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));

beforeEach(() => {
  pedidas = [];
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(
      `${API_BASE}/operations/notifications/campaigns`,
      ({ request }) => {
        pedidas.push(new URL(request.url));
        return HttpResponse.json({
          data: { data: [CAMPAIGN], pagination: PAGINATION },
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

describe("CampaignsPage — el admin observa las campañas del ERP", () => {
  it("lista las campañas con su estado en palabras y su audiencia", async () => {
    render();

    await waitFor(() =>
      expect(screen.getByText("Recordatorio de cuota")).toBeInTheDocument(),
    );
    expect(screen.getByText("Enviando")).toBeInTheDocument();
    expect(screen.getByText("40 personas")).toBeInTheDocument();
    expect(screen.getByText("70 avisos generados")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver" })).toHaveAttribute(
      "href",
      "/internal/notifications/campaigns/12",
    );
    expect(pedidas[0]?.searchParams.get("page")).toBe("1");
  });

  it("no ofrece crear, programar, duplicar ni probar: eso es del ERP", async () => {
    render(["admin"]);
    await waitFor(() =>
      expect(screen.getByText("Recordatorio de cuota")).toBeInTheDocument(),
    );

    for (const nombre of [
      /nueva/i,
      /crear/i,
      /programar/i,
      /duplicar/i,
      /prueba/i,
    ]) {
      expect(screen.queryByRole("button", { name: nombre })).toBeNull();
    }
  });

  it("sin un rol que el servidor acepte no pide nada y lo dice", async () => {
    render(["risk_analyst"]);

    expect(await screen.findByText(/acceso restringido/i)).toBeInTheDocument();
    expect(pedidas).toHaveLength(0);
  });
});
