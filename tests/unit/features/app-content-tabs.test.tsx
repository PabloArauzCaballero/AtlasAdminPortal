import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { SurfaceTabs } from "@/features/app-content/surface-tabs";
import { renderWithProviders } from "../../helpers/render-with-providers";
import { elegirOpcion } from "../shared/option-select-helpers";

const mockUseAuth = vi.fn();
vi.mock("@/shared/auth/auth-context", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));

const { AppContentPage } =
  await import("@/features/app-content/app-content-page");
const request = vi.mocked(apiRequest);

describe("las pestañas de pantallas", () => {
  it("una pantalla sin piezas no tiene pestaña y se avisa de cómo estrenarla", () => {
    render(
      <SurfaceTabs
        surface="faq"
        counts={{ faq: 6, onboarding: 4, home: 0, profile: 0 }}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByTestId("surface-faq")).toHaveTextContent("6");
    expect(screen.getByTestId("surface-onboarding")).toHaveTextContent("4");
    expect(screen.queryByTestId("surface-home")).toBeNull();
    expect(screen.queryByTestId("surface-profile")).toBeNull();
    expect(screen.getByTestId("surfaces-sin-piezas")).toHaveTextContent(
      "Inicio, Perfil",
    );
    expect(screen.getByTestId("surfaces-sin-piezas")).toHaveTextContent(
      "Nueva pieza",
    );
  });

  it("la pestaña seleccionada se queda aunque esté vacía (si no, desaparecería bajo los pies)", () => {
    render(
      <SurfaceTabs
        surface="home"
        counts={{ home: 0, faq: 3 }}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByTestId("surface-home")).toBeInTheDocument();
  });

  it("mientras no se sabe cuántas piezas tiene una pantalla, no se esconde", () => {
    render(<SurfaceTabs surface="faq" counts={{}} onSelect={() => {}} />);
    expect(screen.getByTestId("surface-home")).toBeInTheDocument();
    expect(screen.queryByTestId("surfaces-sin-piezas")).toBeNull();
  });

  it("elegir una pestaña avisa de la pantalla elegida", () => {
    const onSelect = vi.fn();
    render(
      <SurfaceTabs
        surface="faq"
        counts={{ faq: 1, help: 2 }}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId("surface-help"));
    expect(onSelect).toHaveBeenCalledWith("help");
  });
});

describe("la página: estrenar una pantalla vacía", () => {
  const listado = (surface: string, total: number) => ({
    items: [],
    meta: { page: 1, limit: 20, total, totalPages: 1 },
    summary: { total, visible: total, hidden: 0 },
    surface,
  });

  beforeEach(() => {
    request.mockReset();
    mockUseAuth.mockReturnValue({
      permissions: ["governance.policies.read", "governance.policies.manage"],
    });
    request.mockImplementation(async (_path, options) => {
      const surface = String(
        (options as { query?: { surface?: string } })?.query?.surface ?? "",
      );
      return listado(
        surface,
        surface === "faq" ? 6 : surface === "onboarding" ? 4 : 0,
      ) as never;
    });
  });

  it("solo salen las pestañas con piezas, con su conteo", async () => {
    renderWithProviders(<AppContentPage />);
    await waitFor(() =>
      expect(screen.queryByTestId("surface-home")).toBeNull(),
    );
    expect(screen.getByTestId("surface-faq")).toHaveTextContent("6");
    expect(screen.getByTestId("surface-onboarding")).toHaveTextContent("4");
    expect(screen.queryByTestId("surface-credit")).toBeNull();
  });

  it("«Nueva pieza» deja elegir la pantalla vacía y su pestaña aparece, sin perder lo escrito", async () => {
    renderWithProviders(<AppContentPage />);
    await waitFor(() =>
      expect(screen.queryByTestId("surface-home")).toBeNull(),
    );
    fireEvent.click(await screen.findByTestId("app-content-new-button"));
    fireEvent.change(screen.getByTestId("new-content-title"), {
      target: { value: "Aviso de prueba" },
    });

    await elegirOpcion(screen.getByTestId("new-content-surface"), "home");

    expect(await screen.findByTestId("surface-home")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("new-content-title")).toHaveValue(
      "Aviso de prueba",
    );
  });
});
