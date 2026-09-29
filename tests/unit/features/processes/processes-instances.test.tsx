import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/shared/auth/auth-context";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import { makeSession, makeUser } from "../../../helpers/session-fixtures";
import { makeDetail } from "./fixtures";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  params: new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/internal/procesos/account_signup_to_login",
  useRouter: () => ({ push: vi.fn(), replace: nav.replace, prefetch: vi.fn() }),
  useSearchParams: () => nav.params,
}));
vi.mock("@/shared/auth/auth-service", () => ({
  logoutInternal: vi.fn(),
  loginInternal: vi.fn(),
  getInternalMe: vi.fn(),
}));

const hooks = vi.hoisted(() => ({
  useProcess: vi.fn(),
  useProcessInstances: vi.fn(),
  useInstanceProgress: vi.fn(),
  useProcessWiring: vi.fn(),
}));
vi.mock("@/features/processes/hooks", () => hooks);

import { ProcessDetailPage } from "@/features/processes/process-detail-page";

const SUPPORTED = {
  supported: true,
  entity: makeDetail().instanceEntity,
  byStatus: [
    { status: "registered", total: 7, open: true },
    { status: "active", total: 40, open: false },
  ],
  items: [{ id: "101", label: "CUS-101", status: "registered", open: true }],
  total: 1,
  page: 1,
  pageSize: 25,
};

function renderPage() {
  setStoredInternalSession(
    makeSession({ user: makeUser({ permissions: ["workflows.read"] }) }),
  );
  return render(
    <AuthProvider>
      <ProcessDetailPage code="account_signup_to_login" />
    </AuthProvider>,
  );
}

beforeEach(() => {
  nav.replace.mockReset();
  // Los casos son ahora la pestaña «Casos en curso» de la ficha (antes `/instancias`).
  nav.params = new URLSearchParams("tab=casos");
  hooks.useProcess.mockReturnValue({ data: makeDetail() });
  hooks.useProcessInstances.mockReturnValue({
    isLoading: false,
    error: null,
    data: SUPPORTED,
    refetch: vi.fn(),
  });
  hooks.useInstanceProgress.mockReturnValue({
    isLoading: false,
    error: null,
    data: {
      code: "account_signup_to_login",
      instance: { id: "101", label: "CUS-101", status: "registered" },
      stages: [
        {
          code: "signup",
          name: "Registro",
          actor: "customer",
          client: "CONSUMER_APP",
          screen: null,
          link: null,
          state: "reached",
        },
        {
          code: "contacts",
          name: "Contactos pendientes",
          actor: "internal_user",
          client: "ADMIN_PORTAL",
          screen:
            "/internal/operations/customers/:customerId/investigation-summary",
          link: null,
          state: "current",
        },
      ],
    },
    refetch: vi.fn(),
  });
});

describe("Procesos · casos en curso", () => {
  it("cuenta por estado y el recuento filtra la lista", async () => {
    const user = userEvent.setup();
    renderPage();
    const recuento = screen.getByLabelText("Casos por estado");
    expect(recuento).toHaveTextContent("7");
    await user.click(within(recuento).getAllByRole("button")[0] as HTMLElement);
    expect(hooks.useProcessInstances).toHaveBeenLastCalledWith(
      "account_signup_to_login",
      expect.objectContaining({ status: "registered", page: 1 }),
    );
  });

  it("al abrir un caso lo deja en la URL para poder compartirlo", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Ver avance" }));
    expect(nav.replace).toHaveBeenCalledWith(
      "/internal/procesos/account_signup_to_login?tab=casos&caso=101",
      { scroll: false },
    );
  });

  it("con un caso abierto enseña en qué etapa está y enlaza su pantalla con el id", () => {
    nav.params = new URLSearchParams("tab=casos&caso=101");
    renderPage();
    const avance = screen.getByTestId("avance-del-caso");
    expect(within(avance).getByText("Está aquí")).toBeInTheDocument();
    expect(within(avance).getByText("Superada")).toBeInTheDocument();
    expect(
      within(avance).getByRole("link", { name: /abrir la pantalla/i }),
    ).toHaveAttribute(
      "href",
      "/internal/operations/customers/101/investigation-summary",
    );
  });

  it("si los casos viven en otro sistema lo dice en vez de enseñar una lista vacía", () => {
    hooks.useProcessInstances.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        supported: false,
        reason:
          "Las instancias viven en ERP_BACKEND; se consultan en su portal.",
        entity: null,
      },
      refetch: vi.fn(),
    });
    renderPage();
    expect(
      screen.getByText("Los casos de este proceso no se ven desde aquí"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Casos por estado")).not.toBeInTheDocument();
  });
});
