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

/**
 * La «Cola de trabajo» absorbió «Revisión manual» y «Casos de fraude» (auditoría 2026-09-29, 02·#3).
 * Se fija: la pestaña viaja como `queue` y vive en `?cola=`, el buscador manda `q`, las cifras salen
 * de `summary.byType`, `fraud_analyst` sólo ve «Fraude» y «Decidir» sale sólo a quien el backend
 * acepta.
 */
const sesion = vi.hoisted(() => ({ roles: ["internal_operator"] as string[] }));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    hasAnyRole: (roles: string[]) =>
      roles.some((r) => sesion.roles.includes(r)),
  }),
}));
const nav = vi.hoisted(() => ({ replace: vi.fn(), search: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/internal/operations/work-queue",
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

const { WorkQueuePage } =
  await import("@/features/operations-cases/work-queue-page");
const { workQueueRedirectHref } =
  await import("@/features/operations-cases/work-queue-tabs");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const pedidas: URLSearchParams[] = [];
let respuesta: () => Response;

const caso = (over: Record<string, unknown>) => ({
  workItemType: "manual_review",
  caseId: "11",
  caseCode: "MR-11",
  customerId: "9",
  customerCode: "CUS-9",
  priority: "high",
  status: "open",
  reasonCode: "kyc_document_unreadable",
  decisionExecutionId: null,
  openedAt: "2026-09-20T10:00:00.000Z",
  createdAt: "2026-09-20T10:00:00.000Z",
  ...over,
});

const pagina = (items: unknown[], total: number, byType: object) =>
  HttpResponse.json({
    data: {
      items,
      meta: { page: 1, limit: 20, total, totalPages: Math.ceil(total / 20) },
      summary: { byType },
    },
  });

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
beforeEach(() => {
  pedidas.length = 0;
  nav.search = "";
  nav.replace.mockReset();
  sesion.roles = ["internal_operator"];
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  respuesta = () =>
    pagina(
      [
        caso({}),
        caso({ workItemType: "fraud", caseId: "12", caseCode: "FR-12" }),
      ],
      45,
      { manual_review: 30, fraud: 15 },
    );
  server.use(
    http.get(`${API_BASE}/operations/work-queue`, ({ request }) => {
      pedidas.push(new URL(request.url).searchParams);
      return respuesta();
    }),
  );
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

const ultima = () => pedidas.at(-1)!;

describe("WorkQueuePage · pestañas, buscador y cifras del servidor", () => {
  it("las cifras y las pestañas salen de summary.byType, no de la página", async () => {
    renderWithProviders(<WorkQueuePage />);
    expect(
      await screen.findByRole("button", { name: "Revisión manual · 30" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Fraude · 15" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Todas · 45" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Revisión manual con estos filtros").parentElement,
    ).toHaveTextContent("30");
    expect(ultima().get("queue")).toBe("all");
    // El código de cliente, que es lo que se busca, se ve en la fila.
    expect(screen.getAllByText("CUS-9").length).toBeGreaterThan(0);
  });

  it("?cola=fraud abre la pestaña «Fraude» (queue=fraud) y cambiar de pestaña escribe la URL", async () => {
    nav.search = "cola=fraud";
    renderWithProviders(<WorkQueuePage />);
    await waitFor(() => expect(ultima().get("queue")).toBe("fraud"));
    await userEvent.click(
      await screen.findByRole("button", { name: /^Revisión manual/ }),
    );
    expect(nav.replace).toHaveBeenCalledWith(
      "/internal/operations/work-queue?cola=manual_review",
      { scroll: false },
    );
  });

  it("el buscador manda q al servidor (código de cliente o de caso) y el estado sale de un catálogo fijo", async () => {
    respuesta = () => pagina([], 0, { manual_review: 0, fraud: 0 });
    renderWithProviders(<WorkQueuePage />);
    await userEvent.type(
      await screen.findByRole("textbox", {
        name: /código de cliente o de caso/i,
      }),
      "CUS-9",
    );
    await waitFor(() => expect(ultima().get("q")).toBe("CUS-9"));
    await userEvent.click(screen.getByRole("combobox", { name: "Estado" }));
    // `in_progress` no está en la página cargada (vacía) y aun así se puede elegir.
    await userEvent.click(
      await screen.findByRole("option", { name: /in_progress/ }),
    );
    await waitFor(() => expect(ultima().get("status")).toBe("in_progress"));
    expect(
      await screen.findByText("No hay casos para los filtros actuales."),
    ).toBeInTheDocument();
  });

  it("un error se enseña con reintentar y dice quién puede ver la cola", async () => {
    respuesta = () =>
      HttpResponse.json(
        { error: { code: "FORBIDDEN", message: "no" } },
        { status: 403 },
      );
    renderWithProviders(<WorkQueuePage />);
    expect(
      await screen.findByText(/Tu rol no puede hacer esto/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reintentar/i }),
    ).toBeInTheDocument();
  });
});

describe("WorkQueuePage · permisos por pestaña y por decisión", () => {
  it("fraud_analyst sólo ve «Fraude» y pide queue=fraud aunque la URL diga otra cola", async () => {
    sesion.roles = ["fraud_analyst"];
    nav.search = "cola=manual_review";
    respuesta = () =>
      pagina(
        [caso({ workItemType: "fraud", caseId: "12", caseCode: "FR-12" })],
        1,
        {
          fraud: 1,
        },
      );
    renderWithProviders(<WorkQueuePage />);
    await waitFor(() => expect(ultima().get("queue")).toBe("fraud"));
    expect(screen.queryByRole("button", { name: /^Todas/ })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /^Revisión manual/ }),
    ).toBeNull();
    expect(screen.queryByText("Revisión manual con estos filtros")).toBeNull();
    expect(pedidas.every((p) => p.get("queue") === "fraud")).toBe(true);
  });

  it("«Decidir» sólo en los casos que el rol puede decidir (operación: revisión manual sí, fraude no)", async () => {
    renderWithProviders(<WorkQueuePage />);
    const filaManual = (await screen.findByText("MR-11")).closest("tr")!;
    const filaFraude = screen.getByText("FR-12").closest("tr")!;
    expect(
      within(filaManual).getByRole("button", { name: "Decidir" }),
    ).toBeInTheDocument();
    expect(
      within(filaFraude).queryByRole("button", { name: "Decidir" }),
    ).toBeNull();
    expect(
      within(filaFraude).getByText("Decide fraude o administración"),
    ).toBeInTheDocument();
  });

  it("cumplimiento ve la cola pero no decide revisión manual (el backend no lo acepta)", async () => {
    sesion.roles = ["compliance_analyst"];
    renderWithProviders(<WorkQueuePage />);
    const filaManual = (await screen.findByText("MR-11")).closest("tr")!;
    expect(
      within(filaManual).queryByRole("button", { name: "Decidir" }),
    ).toBeNull();
  });
});

describe("rutas viejas → pestañas", () => {
  it("conservan sus parámetros y fijan la cola", () => {
    expect(
      workQueueRedirectHref("manual_review", { caso: "11", tab: ["a", "b"] }),
    ).toBe(
      "/internal/operations/work-queue?caso=11&tab=a&tab=b&cola=manual_review",
    );
    expect(workQueueRedirectHref("fraud", { cola: "all" })).toBe(
      "/internal/operations/work-queue?cola=fraud",
    );
  });
});
