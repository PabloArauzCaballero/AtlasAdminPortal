import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let roles: string[] = [];
let searchParams = new URLSearchParams();
const replace = vi.fn();

vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    permissions: [],
    roles,
    hasAnyRole: (wanted: string[]) =>
      wanted.some((role) => roles.includes(role)),
    hasPermission: () => false,
  }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  usePathname: () => "/internal/jobs",
  useRouter: () => ({ replace, push: vi.fn() }),
  redirect: vi.fn(),
}));
vi.mock("@/features/operational-jobs/job-history-tab", () => ({
  JobHistoryTab: () => <p>contenido del historial</p>,
}));
vi.mock("@/features/runtime-jobs/runtime-jobs-page", () => ({
  RuntimeJobsPanel: () => <p>contenido de ejecutar ahora</p>,
}));

const { JobsPage } = await import("@/features/operational-jobs/jobs-page");

beforeEach(() => {
  replace.mockReset();
  searchParams = new URLSearchParams();
});

describe("Jobs: Historial y Ejecutar ahora en una sola pantalla", () => {
  it("un administrador ve las dos pestañas y ?tab=ejecutar abre «Ejecutar ahora»", () => {
    roles = ["admin"];
    searchParams = new URLSearchParams("tab=ejecutar");
    render(<JobsPage />);
    expect(
      screen.getByRole("button", { name: "Historial" }),
    ).toBeInTheDocument();
    expect(screen.getByText("contenido de ejecutar ahora")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Historial" }));
    expect(replace).toHaveBeenCalledWith("/internal/jobs", { scroll: false });
  });

  it("un operador sin rol de ejecución no ve la pestaña ni aunque la pida por URL", () => {
    roles = ["internal_operator"];
    searchParams = new URLSearchParams("tab=ejecutar");
    render(<JobsPage />);
    expect(screen.queryByRole("button", { name: "Ejecutar ahora" })).toBeNull();
    expect(screen.getByText("contenido del historial")).toBeInTheDocument();
    expect(screen.queryByText("contenido de ejecutar ahora")).toBeNull();
  });

  it("el rol `system` (sólo dispara jobs) entra directo a «Ejecutar ahora»", () => {
    roles = ["system"];
    render(<JobsPage />);
    expect(screen.getByText("contenido de ejecutar ahora")).toBeInTheDocument();
    expect(screen.queryByText("contenido del historial")).toBeNull();
  });

  it("sin ningún rol, acceso restringido", () => {
    roles = ["customer"];
    render(<JobsPage />);
    expect(screen.queryByText("contenido del historial")).toBeNull();
    expect(screen.queryByText("contenido de ejecutar ahora")).toBeNull();
  });
});

describe("rutas viejas", () => {
  it("/internal/operations/runtime-jobs redirige a Jobs › Ejecutar ahora", async () => {
    const navigation = await import("next/navigation");
    const { default: RuntimeJobsRoute } =
      await import("@/app/internal/operations/runtime-jobs/page");
    RuntimeJobsRoute();
    expect(navigation.redirect).toHaveBeenCalledWith(
      "/internal/jobs?tab=ejecutar",
    );
  });
});
