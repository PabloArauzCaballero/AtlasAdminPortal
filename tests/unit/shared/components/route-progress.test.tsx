import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouteProgress } from "@/shared/components/layout/route-progress";

const { usePathname, useSearchParams } = vi.hoisted(() => ({
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname, useSearchParams }));

const INDICADOR = "Cargando página";

function montar(pathname = "/internal", search = "") {
  usePathname.mockReturnValue(pathname);
  useSearchParams.mockReturnValue(new URLSearchParams(search));
  return render(
    <div>
      <RouteProgress />
      <a href="/internal/audit">Auditoría</a>
      <a href="/internal">Actual</a>
      <a href="https://example.invalid">Externo</a>
      <a href="/internal/reports" target="_blank" rel="noreferrer">
        Nueva pestaña
      </a>
    </div>,
  );
}

function hayIndicador() {
  return screen.queryByRole("status", { name: INDICADOR }) !== null;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("RouteProgress", () => {
  it("no muestra nada mientras no se navega", () => {
    montar();

    expect(hayIndicador()).toBe(false);
  });

  it("al pulsar un enlace interno avisa de que la navegación va en curso", () => {
    // App Router no emite eventos de navegación: sin esto, una ruta lenta
    // parece la app congelada.
    montar();

    fireEvent.click(screen.getByRole("link", { name: "Auditoría" }));

    expect(hayIndicador()).toBe(true);
  });

  it("un enlace a la ruta actual no dispara el indicador", () => {
    // No hay navegación que esperar: la barra se quedaría colgada para siempre.
    montar("/internal");

    fireEvent.click(screen.getByRole("link", { name: "Actual" }));

    expect(hayIndicador()).toBe(false);
  });

  it("un enlace externo no dispara el indicador", () => {
    montar();

    fireEvent.click(screen.getByRole("link", { name: "Externo" }));

    expect(hayIndicador()).toBe(false);
  });

  it("abrir en otra pestaña no dispara el indicador", () => {
    // La ruta actual no cambia, así que nada lo apagaría.
    montar();

    fireEvent.click(screen.getByRole("link", { name: "Nueva pestaña" }));

    expect(hayIndicador()).toBe(false);
  });

  it("ctrl+clic (abrir en pestaña nueva) no dispara el indicador", () => {
    montar();

    fireEvent.click(screen.getByRole("link", { name: "Auditoría" }), {
      ctrlKey: true,
    });

    expect(hayIndicador()).toBe(false);
  });

  it("el clic derecho o secundario no dispara el indicador", () => {
    montar();

    fireEvent.click(screen.getByRole("link", { name: "Auditoría" }), {
      button: 1,
    });

    expect(hayIndicador()).toBe(false);
  });

  it("se apaga cuando la nueva ruta ya ha renderizado", () => {
    const { rerender } = montar("/internal");
    fireEvent.click(screen.getByRole("link", { name: "Auditoría" }));
    expect(hayIndicador()).toBe(true);

    usePathname.mockReturnValue("/internal/audit");
    rerender(
      <div>
        <RouteProgress />
      </div>,
    );

    expect(hayIndicador()).toBe(false);
  });
});
