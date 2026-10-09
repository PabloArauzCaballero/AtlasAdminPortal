import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDLE_LIMIT_MS, IDLE_WARNING_MS } from "@/shared/auth/idle-timer";

/**
 * ADM-06: 15 minutos sin actividad cierran la sesión, con aviso al 14; la actividad de otra
 * pestaña cuenta, y el cierre se reparte.
 */
const { logout } = vi.hoisted(() => ({ logout: vi.fn() }));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({ logout }),
}));

const { IdleLogoutGuard } = await import("@/shared/auth/idle-logout-guard");
const CHANNEL = "atlas_internal_activity";

/** Avanza el reloj y deja correr el `setInterval` de un segundo. */
function avanzar(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("IdleLogoutGuard", () => {
  beforeEach(() => {
    // Sólo relojes y temporizadores: los mensajes de `BroadcastChannel` siguen llegando de verdad.
    vi.useFakeTimers({
      toFake: ["Date", "setInterval", "clearInterval", "setTimeout"],
    });
    logout.mockResolvedValue({ serverConfirmed: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("no molesta antes del minuto 14", () => {
    render(<IdleLogoutGuard />);
    avanzar(IDLE_WARNING_MS - 2_000);
    expect(
      screen.queryByText("Tu sesión está por cerrarse"),
    ).not.toBeInTheDocument();
  });

  it("la actividad reinicia la cuenta", () => {
    render(<IdleLogoutGuard />);
    avanzar(IDLE_WARNING_MS - 60_000);
    fireEvent.keyDown(window, { key: "a" });
    avanzar(IDLE_WARNING_MS - 60_000);
    expect(
      screen.queryByText("Tu sesión está por cerrarse"),
    ).not.toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });

  it("al minuto 14 avisa con cuenta atrás, y «Seguir conectado» lo cierra", () => {
    render(<IdleLogoutGuard />);
    avanzar(IDLE_WARNING_MS + 1_000);
    expect(screen.getByText("Tu sesión está por cerrarse")).toBeInTheDocument();
    expect(screen.getByText("0:59")).toBeInTheDocument();

    // Con el aviso abierto, mover el ratón no basta.
    fireEvent.pointerMove(window);
    avanzar(1_000);
    expect(screen.getByText("Tu sesión está por cerrarse")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Seguir conectado" }));
    expect(
      screen.queryByText("Tu sesión está por cerrarse"),
    ).not.toBeInTheDocument();
    avanzar(IDLE_WARNING_MS - 5_000);
    expect(logout).not.toHaveBeenCalled();
  });

  it("a los 15 minutos cierra por inactividad, una sola vez, y avisa a las otras pestañas", async () => {
    const otra = new BroadcastChannel(CHANNEL);
    const recibidos: unknown[] = [];
    otra.onmessage = (event) => recibidos.push(event.data);

    render(<IdleLogoutGuard />);
    avanzar(IDLE_LIMIT_MS + 3_000);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledWith("idle");
    await vi.waitFor(() =>
      expect(recibidos).toContainEqual({ type: "IDLE_LOGOUT" }),
    );
    otra.close();
  });

  it("«Cerrar sesión ahora» cierra como la persona, no como inactividad", () => {
    render(<IdleLogoutGuard />);
    avanzar(IDLE_WARNING_MS + 1_000);
    fireEvent.click(
      screen.getByRole("button", { name: "Cerrar sesión ahora" }),
    );
    expect(logout).toHaveBeenCalledWith();
  });

  it("la actividad de otra pestaña mantiene viva ésta", async () => {
    const otra = new BroadcastChannel(CHANNEL);
    render(<IdleLogoutGuard />);
    avanzar(IDLE_WARNING_MS - 10_000);
    otra.postMessage({ type: "ACTIVITY", at: Date.now() });
    // El mensaje llega por el bucle de eventos real (`setImmediate` no está simulado).
    for (let i = 0; i < 20; i += 1) {
      await act(() => new Promise((resolve) => setImmediate(resolve)));
    }
    avanzar(IDLE_WARNING_MS - 10_000);
    expect(
      screen.queryByText("Tu sesión está por cerrarse"),
    ).not.toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
    otra.close();
  });

  it("si otra pestaña cerró por inactividad, ésta cierra también", async () => {
    const otra = new BroadcastChannel(CHANNEL);
    render(<IdleLogoutGuard />);
    otra.postMessage({ type: "IDLE_LOGOUT" });
    await vi.waitFor(() => expect(logout).toHaveBeenCalledWith("idle"));
    otra.close();
  });
});
