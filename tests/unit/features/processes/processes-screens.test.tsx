import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/shared/auth/auth-context";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import { makeSession, makeUser } from "../../../helpers/session-fixtures";
import { makeDetail, makeItem } from "./fixtures";
import {
  buscar,
  esperarFilas,
  filasDeDatos,
  filtrarPor,
} from "../../shared/tabla-helpers";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  params: new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/internal/procesos/account_signup_to_login",
  useRouter: () => ({ push: vi.fn(), replace: nav.replace, prefetch: vi.fn() }),
  useSearchParams: () => nav.params,
}));
vi.mock("@/features/flows/flow-detail-drawer", () => ({
  FlowDetailDrawer: ({ flowId }: { flowId: string | null }) =>
    flowId ? <div data-testid="ficha-tecnica">{flowId}</div> : null,
}));
vi.mock("@/shared/auth/auth-service", () => ({
  logoutInternal: vi.fn(),
  loginInternal: vi.fn(),
  getInternalMe: vi.fn(),
}));

const hooks = vi.hoisted(() => ({
  useProcesses: vi.fn(),
  useProcess: vi.fn(),
  useProcessWiring: vi.fn(),
}));
vi.mock("@/features/processes/hooks", () => hooks);

import { ProcessDetailPage } from "@/features/processes/process-detail-page";
import { ProcessesPage } from "@/features/processes/processes-page";

function renderAs(ui: React.ReactElement, permissions: string[]) {
  setStoredInternalSession(makeSession({ user: makeUser({ permissions }) }));
  return render(<AuthProvider>{ui}</AuthProvider>);
}

const unwiredItem = makeItem({
  processId: "P-16",
  code: "partner_onboarding",
  name: "Alta de comercio",
  wiring: { wired: 1, unwired: 2, unknown: 0, personSteps: 3 },
  documentation: { ...makeItem().documentation, complete: false, owner: false },
});

beforeEach(() => {
  nav.replace.mockReset();
  nav.params = new URLSearchParams();
  hooks.useProcesses.mockReturnValue({
    isLoading: false,
    error: null,
    data: {
      totals: { processes: 2, documented: 1, fullyWired: 1, unwiredSteps: 2 },
      items: [makeItem(), unwiredItem],
    },
    refetch: vi.fn(),
  });
  hooks.useProcess.mockReturnValue({
    isLoading: false,
    error: null,
    data: makeDetail(),
    refetch: vi.fn(),
  });
  hooks.useProcessWiring.mockReturnValue({
    data: {
      code: "account_signup_to_login",
      summary: { wired: 1, unwired: 1, unknown: 0, personSteps: 2 },
      steps: [
        {
          stageCode: "contacts",
          stageName: "Contactos pendientes",
          client: "ADMIN_PORTAL",
          screen: "/internal/operations/pending-contacts",
          stepCode: "close_contact",
          stepName: "Cerrar el contacto",
          system: "ATLAS_BACKEND",
          wiring: "unwired",
          callers: [],
          flowId: null,
        },
      ],
    },
  });
});

describe("Procesos · listado", () => {
  it("sin workflows.read no pide nada y dice que el acceso está restringido", () => {
    renderAs(<ProcessesPage />, ["systems.flows.read"]);
    expect(screen.getByText("Acceso restringido")).toBeInTheDocument();
    expect(hooks.useProcesses).not.toHaveBeenCalled();
  });

  it("pinta las cuatro cifras, la documentación y los pasos sin pantalla por fila", () => {
    renderAs(<ProcessesPage />, ["workflows.read"]);
    expect(screen.getByText("Pasos sin pantalla")).toBeInTheDocument();
    expect(screen.getByText("Totalmente cableados")).toBeInTheDocument();
    const fila = screen.getByText("Alta de comercio").closest("tr");
    expect(fila).not.toBeNull();
    expect(
      within(fila as HTMLElement).getByText("2 sin pantalla"),
    ).toBeInTheDocument();
    expect(within(fila as HTMLElement).getByText("4 de 5")).toBeInTheDocument();
    expect(
      within(fila as HTMLElement).getByRole("link", { name: "Ver ficha" }),
    ).toHaveAttribute("href", "/internal/procesos/partner_onboarding");
  });

  it("la cifra de pasos sin pantalla filtra la tabla a los procesos que los tienen", async () => {
    const user = userEvent.setup();
    renderAs(<ProcessesPage />, ["workflows.read"]);
    await user.click(screen.getByText("Pasos sin pantalla"));
    expect(screen.queryByText("Alta de cuenta")).not.toBeInTheDocument();
    expect(screen.getByText("Alta de comercio")).toBeInTheDocument();
  });

  it("muestra el error con reintento si la lista no carga", () => {
    const refetch = vi.fn();
    hooks.useProcesses.mockReturnValue({
      isLoading: false,
      error: new Error("red"),
      data: undefined,
      refetch,
    });
    renderAs(<ProcessesPage />, ["workflows.read"]);
    expect(
      screen.getByText("No se pudieron cargar los procesos."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reintentar/i }),
    ).toBeInTheDocument();
  });
});

/** Abre la ficha en una pestaña (`?tab=`), como llega desde un enlace o tras pulsarla. */
function renderTab(tab: string | null, permissions = ["workflows.read"]) {
  nav.params = new URLSearchParams(tab ? `tab=${tab}` : "");
  return renderAs(
    <ProcessDetailPage code="account_signup_to_login" />,
    permissions,
  );
}

describe("Procesos · ficha", () => {
  it("abre en Resumen con las cinco preguntas y los contadores del servidor", () => {
    renderTab(null);
    for (const pregunta of [
      "¿Por qué existe?",
      "¿Quién lo empieza y quién lo cierra?",
      "¿Cuándo empieza y cuándo termina?",
      "¿Qué pasa cuando falla?",
      "¿Cómo se sabe que va bien?",
    ])
      expect(screen.getByText(pregunta)).toBeInTheDocument();
    // Los contadores salen de `flowStats` del servidor (fixture: 3 con flujo, 2 críticos, 1 verificado).
    expect(screen.getByText("Críticos").closest("section")).toHaveTextContent(
      "2",
    );
    expect(
      screen.getByText("Con flujo en el mapa").closest("section"),
    ).toHaveTextContent("3");
    expect(screen.queryByTestId("etapa-contacts")).not.toBeInTheDocument();
  });

  it("cambiar de pestaña la deja en la URL (`?tab=`) para poder compartirla", async () => {
    const user = userEvent.setup();
    renderTab(null);
    await user.click(screen.getByRole("button", { name: "Casos en curso" }));
    expect(nav.replace).toHaveBeenCalledWith(
      "/internal/procesos/account_signup_to_login?tab=casos",
      { scroll: false },
    );
  });

  it("Documentación y cableado destaca los pasos sin pantalla", () => {
    renderTab("documentacion");
    const aviso = screen.getByRole("status");
    expect(aviso).toHaveTextContent("1 paso sin pantalla");
    expect(aviso).toHaveTextContent("Cerrar el contacto");
  });

  it("Pasos y flujos es una tabla: una fila por paso, con su cableado y la pantalla de la etapa", () => {
    renderTab("pasos");
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(
      within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((th) => th.textContent)
        .filter(Boolean),
    ).toEqual([
      "Etapa",
      "Quién actúa",
      "Pantalla",
      "Paso",
      "Cableado",
      "Riesgo y prueba",
      "Cómo se hace",
      "Bloque",
      "Quién la llama",
      "Mapa de rutas",
    ]);
    const paso = screen.getByTestId("paso-close_contact").closest("tr")!;
    expect(within(paso).getByText("Sin pantalla")).toBeInTheDocument();
    const otro = screen.getByTestId("paso-resend_code").closest("tr")!;
    expect(within(otro).getByText("Con pantalla")).toBeInTheDocument();
    expect(
      within(otro).getByRole("link", { name: /abrir la pantalla/i }),
    ).toHaveAttribute("href", "/internal/operations/pending-contacts");
    expect(
      within(otro).getByText("Contactos pendientes", { exact: false }),
    ).toBeInTheDocument();
  });

  it("el buscador y el filtro de cableado recortan los pasos", async () => {
    renderTab("pasos");
    await buscar(/Buscar por etapa, paso, descripción o ruta/, "reenviar");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("Reenviar el código");
    await buscar(/Buscar por etapa, paso, descripción o ruta/, "");
    await esperarFilas(2);
    await filtrarPor(/^Cableado/, "unwired");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("Cerrar el contacto");
    await buscar(/Buscar por etapa, paso, descripción o ruta/, "zzz");
    expect(
      await screen.findByText("Ningún paso coincide con la búsqueda."),
    ).toBeInTheDocument();
  });

  it("con permiso del mapa de rutas enlaza el flujo y abre su ficha técnica", async () => {
    const user = userEvent.setup();
    renderTab("pasos", ["workflows.read", "systems.flows.read"]);
    const paso = screen.getByTestId("paso-resend_code").closest("tr")!;
    expect(paso).toHaveTextContent(
      "/customer-onboarding/:id/contact-verification/request",
    );
    expect(
      within(paso).getByRole("link", { name: "Abrir en el mapa de rutas" }),
    ).toHaveAttribute("href", "/internal/flows?flow=flow_abc123def456");
    await user.click(
      within(paso).getByRole("button", { name: "Ver ficha técnica" }),
    );
    expect(screen.getByTestId("ficha-tecnica")).toHaveTextContent(
      "flow_abc123def456",
    );
  });

  it("sin systems.flows.read no enseña enlaces al mapa de rutas (llevaban a «acceso restringido»)", () => {
    renderTab("pasos");
    const paso = screen.getByTestId("paso-resend_code").closest("tr")!;
    expect(
      within(paso).queryByRole("link", { name: /mapa de rutas/i }),
    ).not.toBeInTheDocument();
    expect(
      within(paso).queryByRole("button", { name: "Ver ficha técnica" }),
    ).not.toBeInTheDocument();
  });

  it("un paso sin prueba automática lo dice", () => {
    const detail = makeDetail();
    const step = detail.stages[0]!.steps[0]!;
    step.testStatus = "UNTESTED";
    hooks.useProcess.mockReturnValue({
      isLoading: false,
      error: null,
      data: detail,
      refetch: vi.fn(),
    });
    renderTab("pasos");
    expect(
      within(screen.getByTestId(`paso-${step.code}`).closest("tr")!).getByText(
        "sin prueba",
      ),
    ).toBeInTheDocument();
  });

  it("una etapa sin pasos sale con una fila que lo dice", () => {
    const detail = makeDetail();
    detail.stages[0]!.steps = [];
    hooks.useProcess.mockReturnValue({
      isLoading: false,
      error: null,
      data: detail,
      refetch: vi.fn(),
    });
    renderTab("pasos");
    expect(
      screen.getByText("Esta etapa no declara pasos."),
    ).toBeInTheDocument();
  });

  it("Documentación y cableado lista las cinco comprobaciones en una tabla", async () => {
    renderTab("documentacion");
    const tabla = screen.getAllByRole("table")[0]!;
    expect(
      within(tabla)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Comprobación", "Estado", "Qué se mira"]);
    expect(within(tabla).getAllByRole("row")).toHaveLength(6);
    await buscar(/Buscar por comprobación o por lo que se mira/, "dueño");
    await waitFor(() =>
      expect(within(tabla).getAllByRole("row")).toHaveLength(2),
    );
  });

  it("un código que no existe se explica en vez de romper la pantalla", async () => {
    const { AtlasApiError } = await import("@/shared/api/errors");
    hooks.useProcess.mockReturnValue({
      isLoading: false,
      error: new AtlasApiError({
        status: 404,
        code: "PROCESS_NOT_FOUND",
        message: "No hay",
      }),
      data: undefined,
      refetch: vi.fn(),
    });
    renderAs(<ProcessDetailPage code="no_existe" />, ["workflows.read"]);
    expect(screen.getByText("Este proceso no existe")).toBeInTheDocument();
  });

  it("avisa cuando la base guarda una versión anterior a la del código", () => {
    hooks.useProcess.mockReturnValue({
      isLoading: false,
      error: null,
      data: makeDetail({ databaseHash: "bbbbbbbbbbbb" }),
      refetch: vi.fn(),
    });
    renderTab("documentacion");
    expect(
      screen.getByText("La base tiene una versión anterior"),
    ).toBeInTheDocument();
  });
});
