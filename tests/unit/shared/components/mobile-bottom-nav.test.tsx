import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileBottomNav } from "@/shared/components/layout/internal-shell/mobile-bottom-nav";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

const { useMyUnreadNotificationsCount } = vi.hoisted(() => ({
  useMyUnreadNotificationsCount: vi.fn(),
}));
vi.mock("@/features/my-notifications/hooks", () => ({
  useMyUnreadNotificationsCount,
}));

function renderBar({
  pathname = "/internal",
  unread = 0,
  moreOpen = false,
  onMore = vi.fn(),
} = {}) {
  usePathname.mockReturnValue(pathname);
  useMyUnreadNotificationsCount.mockReturnValue({ data: { unread } });
  render(<MobileBottomNav onMore={onMore} moreOpen={moreOpen} />);
  return { onMore };
}

afterEach(cleanup);

describe("MobileBottomNav · accesos del pulgar", () => {
  it("lleva a las tres pantallas que no piden permiso y deja «Más» para el resto", () => {
    renderBar();

    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute(
      "href",
      "/internal",
    );
    expect(screen.getByRole("link", { name: "Buscar" })).toHaveAttribute(
      "href",
      "/internal/search",
    );
    expect(screen.getByRole("link", { name: "Avisos" })).toHaveAttribute(
      "href",
      "/internal/my-notifications",
    );
    expect(screen.getByRole("button", { name: /^Más/ })).toBeInTheDocument();
  });

  it("marca la pantalla actual con aria-current, y solo esa", () => {
    renderBar({ pathname: "/internal/search" });

    expect(screen.getByRole("link", { name: "Buscar" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Inicio" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("«Inicio» no queda activo en cualquier pantalla interna", () => {
    renderBar({ pathname: "/internal/audit" });

    expect(screen.getByRole("link", { name: "Inicio" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("«Más» abre el cajón y anuncia si está abierto", async () => {
    const user = userEvent.setup();
    const { onMore } = renderBar({ moreOpen: true });

    const mas = screen.getByRole("button", { name: /^Más/ });
    expect(mas).toHaveAttribute("aria-controls", "atlas-nav");
    expect(mas).toHaveAttribute("aria-expanded", "true");
    await user.click(mas);
    expect(onMore).toHaveBeenCalledTimes(1);
  });

  it("los avisos sin leer se dicen con texto, no solo con el punto rojo", () => {
    renderBar({ unread: 3 });

    expect(
      screen.getByRole("link", { name: "Avisos: 3 sin leer" }),
    ).toBeInTheDocument();
  });

  it("sin avisos pendientes el nombre accesible es solo «Avisos»", () => {
    renderBar({ unread: 0 });

    expect(screen.getByRole("link", { name: "Avisos" })).toBeInTheDocument();
  });

  it("si el contador aún no llegó no inventa un número", () => {
    usePathname.mockReturnValue("/internal");
    useMyUnreadNotificationsCount.mockReturnValue({ data: undefined });
    render(<MobileBottomNav onMore={vi.fn()} moreOpen={false} />);

    expect(screen.getByRole("link", { name: "Avisos" })).toBeInTheDocument();
  });
});
