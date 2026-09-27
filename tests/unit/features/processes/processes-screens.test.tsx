import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/shared/auth/auth-context";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import { makeSession, makeUser } from "../../../helpers/session-fixtures";
import { makeDetail, makeItem } from "./fixtures";

vi.mock("next/navigation", () => ({
  usePathname: () => "/internal/procesos",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
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

describe("Procesos · ficha", () => {
  it("destaca arriba los pasos sin pantalla y los marca en rojo en su etapa", () => {
    renderAs(<ProcessDetailPage code="account_signup_to_login" />, [
      "workflows.read",
    ]);
    const aviso = screen.getByRole("status");
    expect(aviso).toHaveTextContent("1 paso sin pantalla");
    expect(aviso).toHaveTextContent("Cerrar el contacto");
    const paso = screen.getByTestId("paso-close_contact");
    expect(within(paso).getByText("Sin pantalla")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("paso-resend_code")).getByText("Con pantalla"),
    ).toBeInTheDocument();
  });

  it("contesta las cinco preguntas y enlaza la pantalla del portal interno", () => {
    renderAs(<ProcessDetailPage code="account_signup_to_login" />, [
      "workflows.read",
    ]);
    for (const pregunta of [
      "¿Por qué existe?",
      "¿Quién lo empieza y quién lo cierra?",
      "¿Cuándo empieza y cuándo termina?",
      "¿Qué pasa cuando falla?",
      "¿Cómo se sabe que va bien?",
    ])
      expect(screen.getByText(pregunta)).toBeInTheDocument();
    const etapa = screen.getByTestId("etapa-contacts");
    expect(
      within(etapa).getByRole("link", { name: /abrir la pantalla/i }),
    ).toHaveAttribute("href", "/internal/operations/pending-contacts");
    expect(
      screen.getByRole("link", { name: "Casos en curso" }),
    ).toHaveAttribute(
      "href",
      "/internal/procesos/account_signup_to_login/instancias",
    );
  });

  it("la ruta técnica queda dentro del detalle plegado, no en el texto de negocio", () => {
    renderAs(<ProcessDetailPage code="account_signup_to_login" />, [
      "workflows.read",
    ]);
    const paso = screen.getByTestId("paso-resend_code");
    const detalle = within(paso)
      .getByText("Detalle técnico")
      .closest("details");
    expect(detalle).not.toBeNull();
    expect(detalle).not.toHaveAttribute("open");
    expect(detalle).toHaveTextContent(
      "/customer-onboarding/:id/contact-verification/request",
    );
    expect(
      within(detalle as HTMLElement).getByRole("link", {
        name: "Abrir el flujo",
      }),
    ).toHaveAttribute("href", "/internal/flows?flow=flow_abc123def456");
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
    renderAs(<ProcessDetailPage code="account_signup_to_login" />, [
      "workflows.read",
    ]);
    expect(
      screen.getByText("La base tiene una versión anterior"),
    ).toBeInTheDocument();
  });
});
