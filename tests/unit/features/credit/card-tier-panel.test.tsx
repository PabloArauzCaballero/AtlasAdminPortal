import { HttpResponse, http } from "msw";
import { screen, waitFor, within } from "@testing-library/react";
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
import { elegirOpcion } from "../../shared/option-select-helpers";

vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({ hasAnyRole: () => true }),
}));

const { CustomerCardTierPanel, sourceSentence } =
  await import("@/features/credit/card-tier-panel");
const { overrideState } = await import("@/features/credit/card-tier-history");
const { expiryToIso, setCardTierSchema } =
  await import("@/features/credit/card-tier-schemas");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const URL_TARJETA = `${API_BASE}/operations/customers/900/card-tier`;
const peticiones: Array<{ method: string; path: string; body: unknown }> = [];

const tema = (c: string) => ({
  gradient: [c, c],
  ink: "#fff",
  accent: "#fff",
  finish: "acabado",
});
const CATALOGO = (actual: string) =>
  [
    ["NORMAL", "Normal", "NUEVO"],
    ["SILVER", "Silver", "EN_CONSTRUCCION"],
    ["GOLD", "Gold", "ESTABLECIDO"],
    ["PREMIUM", "Premium", "CONSOLIDADO"],
    ["BLACK", "Black", "PREFERENTE"],
  ].map(([code, label, levelCode], i) => ({
    code,
    label,
    levelCode,
    displayOrder: i + 1,
    description: `Descripción ${label}`,
    benefits: [],
    theme: tema("#123456"),
    current: code === actual,
  }));

function vista(over: Record<string, unknown> = {}) {
  return {
    ...CATALOGO("SILVER")[1],
    source: "AUTOMATICA",
    automatic: { code: "SILVER", label: "Silver" },
    manual: null,
    catalog: CATALOGO("SILVER"),
    history: [],
    ...over,
  };
}

const AJUSTE = {
  overrideId: "5",
  tierCode: "GOLD",
  reason: "Cliente fundador de la red",
  setByInternalUserId: "7",
  validFrom: "2026-09-01T00:00:00.000Z",
  expiresAt: null,
  revokedAt: null,
  revokedByInternalUserId: null,
  revokeReason: null,
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
  server.events.on("request:start", async ({ request }) => {
    const body = request.method === "GET" ? null : await request.clone().json();
    peticiones.push({
      method: request.method,
      path: new URL(request.url).pathname.replace("/api/v1", ""),
      body,
    });
  });
});
beforeEach(() => {
  peticiones.length = 0;
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

describe("Tarjeta Atlas en la ficha del cliente", () => {
  it("una tarjeta ganada por nivel se dice automática y no ofrece quitar nada", async () => {
    server.use(
      http.get(URL_TARJETA, () => HttpResponse.json({ data: vista() })),
    );
    renderWithProviders(<CustomerCardTierPanel customerId="900" />);

    expect(await screen.findByText(/· automática/)).toBeInTheDocument();
    expect(screen.getByText(/La ganó por su nivel Atlas/)).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Tarjeta Silver/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nadie le ha puesto una tarjeta a mano."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quitar ajuste" })).toBeNull();
    expect(
      screen.getByText(/no cambia su límite de crédito/),
    ).toBeInTheDocument();
  });

  it("cambia la tarjeta con motivo y vencimiento, y la pantalla toma la respuesta sin otra consulta", async () => {
    server.use(
      http.get(URL_TARJETA, () => HttpResponse.json({ data: vista() })),
      http.post(URL_TARJETA, () =>
        HttpResponse.json({
          data: vista({
            ...CATALOGO("GOLD")[2],
            source: "MANUAL",
            manual: { since: "2026-10-03T00:00:00.000Z", expiresAt: null },
            history: [AJUSTE],
          }),
        }),
      ),
    );
    renderWithProviders(<CustomerCardTierPanel customerId="900" />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Cambiar tarjeta" }),
    );
    const dialogo = await screen.findByRole("dialog");
    await elegirOpcion(
      within(dialogo).getByRole("combobox", { name: /^Tarjeta/ }),
      "GOLD",
    );
    await userEvent.type(
      within(dialogo).getByRole("textbox", { name: /^Motivo/ }),
      "  Cliente fundador de la red  ",
    );
    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Confirmar cambio" }),
    );

    await waitFor(() =>
      expect(peticiones).toContainEqual({
        method: "POST",
        path: "/operations/customers/900/card-tier",
        body: { tierCode: "GOLD", reason: "Cliente fundador de la red" },
      }),
    );
    expect(
      await screen.findByText("Tarjeta cambiada a Gold."),
    ).toBeInTheDocument();
    expect(screen.getByText(/· ajuste manual/)).toBeInTheDocument();
    expect(screen.getByText("Cliente fundador de la red")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    // Sólo el GET de la carga: la respuesta del POST ya traía el estado, no hubo un segundo GET.
    expect(peticiones.filter((p) => p.method === "GET")).toHaveLength(1);
  });

  it("sin elegir tarjeta o con un motivo corto no envía nada y lo dice en el campo", async () => {
    server.use(
      http.get(URL_TARJETA, () => HttpResponse.json({ data: vista() })),
    );
    renderWithProviders(<CustomerCardTierPanel customerId="900" />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Cambiar tarjeta" }),
    );
    const dialogo = await screen.findByRole("dialog");
    await userEvent.type(
      within(dialogo).getByRole("textbox", { name: /^Motivo/ }),
      "corto",
    );
    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Confirmar cambio" }),
    );

    expect(
      await within(dialogo).findByText(/al menos 10 caracteres/),
    ).toBeInTheDocument();
    expect(within(dialogo).getByText("Elige una tarjeta.")).toBeInTheDocument();
    expect(peticiones.some((p) => p.method === "POST")).toBe(false);
  });

  it("un rechazo del servidor se muestra dentro del diálogo y el diálogo queda abierto", async () => {
    server.use(
      http.get(URL_TARJETA, () => HttpResponse.json({ data: vista() })),
      http.post(URL_TARJETA, () =>
        HttpResponse.json(
          {
            error: { code: "BAD_REQUEST", message: "CARD_TIER_EXPIRY_IN_PAST" },
            timestamp: "2026-10-03T00:00:00.000Z",
          },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<CustomerCardTierPanel customerId="900" />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Cambiar tarjeta" }),
    );
    const dialogo = await screen.findByRole("dialog");
    await elegirOpcion(
      within(dialogo).getByRole("combobox", { name: /^Tarjeta/ }),
      "BLACK",
    );
    await userEvent.type(
      within(dialogo).getByRole("textbox", { name: /^Motivo/ }),
      "Acuerdo comercial con la dirección",
    );
    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Confirmar cambio" }),
    );

    expect(
      await within(dialogo).findByText("No se cambió la tarjeta."),
    ).toBeInTheDocument();
    expect(
      within(dialogo).getByText(/El vencimiento debe ser una fecha futura/),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("con un ajuste manual vigente ofrece quitarlo, pide motivo y vuelve a la tarjeta del nivel", async () => {
    server.use(
      http.get(URL_TARJETA, () =>
        HttpResponse.json({
          data: vista({
            ...CATALOGO("GOLD")[2],
            source: "MANUAL",
            automatic: { code: "NORMAL", label: "Normal" },
            manual: { since: "2026-09-01T00:00:00.000Z", expiresAt: null },
            history: [AJUSTE],
          }),
        }),
      ),
      http.post(`${URL_TARJETA}/revoke`, () =>
        HttpResponse.json({
          data: vista({
            ...CATALOGO("NORMAL")[0],
            automatic: { code: "NORMAL", label: "Normal" },
            history: [
              {
                ...AJUSTE,
                revokedAt: "2026-10-03T12:00:00.000Z",
                revokedByInternalUserId: "8",
                revokeReason: "Se corrige tras revisar el expediente",
              },
            ],
          }),
        }),
      ),
    );
    renderWithProviders(<CustomerCardTierPanel customerId="900" />);
    expect(
      await screen.findByText(/Por su nivel le correspondería Normal/),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Quitar ajuste" }),
    );
    const dialogo = await screen.findByRole("dialog");
    await userEvent.type(
      within(dialogo).getByRole("textbox", { name: /^Motivo/ }),
      "Se corrige tras revisar el expediente",
    );
    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Quitar ajuste" }),
    );

    await waitFor(() =>
      expect(peticiones).toContainEqual({
        method: "POST",
        path: "/operations/customers/900/card-tier/revoke",
        body: { reason: "Se corrige tras revisar el expediente" },
      }),
    );
    expect(
      await screen.findByText("Ajuste quitado: vuelve a Normal."),
    ).toBeInTheDocument();
    expect(screen.getByText(/· Revocado/)).toBeInTheDocument();
    expect(
      screen.getByText(/Se corrige tras revisar el expediente/),
    ).toBeInTheDocument();
  });

  it("si el rol no puede ver la tarjeta, lo dice con reintento y no pinta botones de cambio", async () => {
    server.use(
      http.get(URL_TARJETA, () =>
        HttpResponse.json(
          {
            error: { code: "FORBIDDEN", message: "Forbidden" },
            timestamp: "2026-10-03T00:00:00.000Z",
          },
          { status: 403 },
        ),
      ),
    );
    renderWithProviders(<CustomerCardTierPanel customerId="900" />);

    expect(
      await screen.findByText(/Tu rol no puede hacer esta operación/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Reintentar/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cambiar tarjeta" }),
    ).toBeNull();
  });
});

describe("reglas puras de la tarjeta", () => {
  it("el estado de un ajuste: revocado manda sobre vencido y vencido sobre vigente", () => {
    const base = { ...AJUSTE } as Parameters<typeof overrideState>[0];
    const ahora = new Date("2026-10-03T12:00:00Z");
    expect(overrideState(base, ahora)).toBe("Vigente");
    expect(
      overrideState({ ...base, expiresAt: "2026-10-01T00:00:00Z" }, ahora),
    ).toBe("Vencido");
    expect(
      overrideState(
        {
          ...base,
          expiresAt: "2026-10-01T00:00:00Z",
          revokedAt: "2026-09-30T00:00:00Z",
        },
        ahora,
      ),
    ).toBe("Revocado");
  });

  it("el vencimiento vacío no vence; con fecha pasa a ISO al final de ese día", () => {
    expect(expiryToIso("")).toBeUndefined();
    expect(expiryToIso("2999-12-31")).toMatch(/^2999-12-31T|^3000-01-01T/);
  });

  it("el esquema exige tarjeta, motivo de 10+ caracteres y vencimiento futuro", () => {
    const ok = {
      tierCode: "GOLD",
      reason: "Motivo suficientemente largo",
      expiresOn: "",
    };
    expect(setCardTierSchema.safeParse(ok).success).toBe(true);
    expect(
      setCardTierSchema.safeParse({ ...ok, tierCode: "DIAMANTE" }).success,
    ).toBe(false);
    expect(
      setCardTierSchema.safeParse({ ...ok, reason: "corto" }).success,
    ).toBe(false);
    expect(
      setCardTierSchema.safeParse({ ...ok, expiresOn: "2020-01-01" }).success,
    ).toBe(false);
    expect(
      setCardTierSchema.safeParse({ ...ok, expiresOn: "2999-01-01" }).success,
    ).toBe(true);
  });

  it("la frase de origen distingue automática, manual con fecha y manual sin fecha", () => {
    const base = vista() as unknown as Parameters<typeof sourceSentence>[0];
    expect(sourceSentence(base)).toMatch(/La ganó por su nivel/);
    const manual = {
      ...base,
      source: "MANUAL",
      automatic: { code: "NORMAL", label: "Normal" },
    } as Parameters<typeof sourceSentence>[0];
    expect(
      sourceSentence({
        ...manual,
        manual: { since: "2026-09-01T00:00:00Z", expiresAt: null },
      }),
    ).toMatch(/sin fecha de vencimiento/);
    expect(
      sourceSentence({
        ...manual,
        manual: {
          since: "2026-09-01T00:00:00Z",
          expiresAt: "2026-12-01T00:00:00Z",
        },
      }),
    ).toMatch(/hasta el/);
  });
});
