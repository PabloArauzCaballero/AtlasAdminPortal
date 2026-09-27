import { HttpResponse, http } from "msw";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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
import { CAMPAIGN, MESSAGE, METRICS, PAGINATION } from "./fixtures";

const { CampaignDetailPage } =
  await import("@/features/notification-campaigns/campaign-detail-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");
const { AuthProvider } = await import("@/shared/auth/auth-context");
const { setStoredInternalSession } =
  await import("@/shared/auth/session-storage");
const { makeSession, makeUser } =
  await import("../../../helpers/session-fixtures");

/**
 * La ficha de una campaña: avance real por canal, avisos uno a uno y las palancas de freno.
 *
 * Se fija: pausar y cancelar van a sus rutas; cancelar no sale sin un motivo de ocho caracteres y lo
 * manda en `reason`; las palancas sólo aparecen para `admin`/`platform_admin` y sólo las que el
 * estado admite.
 */
const BASE = `${API_BASE}/operations/notifications/campaigns/12`;
let acciones: { path: string; body: unknown }[] = [];

function render(legacyRoles: string[] = ["admin"], status = "running") {
  server.use(
    http.get(BASE, () =>
      HttpResponse.json({ data: { ...CAMPAIGN, status, metrics: METRICS } }),
    ),
  );
  setStoredInternalSession(
    makeSession({ user: makeUser({ roles: ["OPERATOR"], legacyRoles }) }),
  );
  return renderWithProviders(
    <AuthProvider>
      <CampaignDetailPage campaignId="12" />
    </AuthProvider>,
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));

beforeEach(() => {
  acciones = [];
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(`${BASE}/messages`, () =>
      HttpResponse.json({
        data: { data: [MESSAGE], pagination: PAGINATION },
      }),
    ),
    http.post(`${BASE}/:action`, async ({ request, params }) => {
      const text = await request.text();
      acciones.push({
        path: String(params.action),
        body: text ? JSON.parse(text) : null,
      });
      return HttpResponse.json({
        data: { ...CAMPAIGN, status: "paused", metrics: METRICS },
      });
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

describe("CampaignDetailPage — seguir y frenar una campaña", () => {
  it("enseña el avance por canal y los avisos con su estado de entrega", async () => {
    render();

    await waitFor(() =>
      expect(screen.getByText("Recordatorio de cuota")).toBeInTheDocument(),
    );
    expect(screen.getByText(/Entregados: 45/)).toBeInTheDocument();
    expect(screen.getByText(/Fallidos: 5/)).toBeInTheDocument();
    expect(
      screen.getByText("Tiene una cuota vencida", { exact: false }),
    ).toBeInTheDocument();
    expect(await screen.findByText("4411")).toBeInTheDocument();
  });

  it("pausar pide confirmación y va a la ruta de pausa", async () => {
    render();
    fireEvent.click(await screen.findByRole("button", { name: "Pausar" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(
      Array.from(dialogo.querySelectorAll("button")).find(
        (boton) => boton.textContent === "Pausar",
      )!,
    );

    await waitFor(() =>
      expect(acciones).toEqual([{ path: "pause", body: null }]),
    );
  });

  it("cancelar no sale sin motivo y lo manda en `reason`", async () => {
    render();
    fireEvent.click(
      await screen.findByRole("button", { name: "Cancelar campaña" }),
    );
    const dialogo = await screen.findByRole("dialog");
    const confirmar = Array.from(dialogo.querySelectorAll("button")).find(
      (boton) => boton.textContent === "Cancelar campaña",
    )!;
    expect(confirmar).toBeDisabled();

    fireEvent.change(within(dialogo).getByRole("textbox"), {
      target: { value: "El enlace lleva a una pantalla rota" },
    });
    expect(confirmar).toBeEnabled();
    fireEvent.click(confirmar);

    await waitFor(() =>
      expect(acciones).toEqual([
        {
          path: "cancel",
          body: { reason: "El enlace lleva a una pantalla rota" },
        },
      ]),
    );
  });

  it("una campaña pausada ofrece reanudar y no pausar", async () => {
    render(["platform_admin"], "paused");

    expect(
      await screen.findByRole("button", { name: "Reanudar" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pausar" })).toBeNull();
  });

  it("una campaña terminada no ofrece ninguna palanca", async () => {
    render(["admin"], "completed");

    await waitFor(() =>
      expect(screen.getByText("Terminada")).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /Pausar|Reanudar|Cancelar/ }),
    ).toBeNull();
  });

  it("un operador ve la ficha pero no las palancas: el servidor le daría 403", async () => {
    render(["internal_operator"]);

    await waitFor(() =>
      expect(screen.getByText("Recordatorio de cuota")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: "Pausar" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Cancelar campaña" }),
    ).toBeNull();
  });
});
