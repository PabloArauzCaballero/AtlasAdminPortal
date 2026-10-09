import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LogoutNotice } from "@/features/auth/logout-notice";
import { setLogoutNotice } from "@/shared/auth/session-storage";

/** ADM-06: el login cuenta por qué terminó la sesión, una sola vez. */
describe("LogoutNotice", () => {
  it("un cierre normal y confirmado no muestra nada", () => {
    setLogoutNotice({ reason: "user", serverConfirmed: true });
    const { container } = render(<LogoutNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it("explica el cierre por inactividad", () => {
    setLogoutNotice({ reason: "idle", serverConfirmed: true });
    render(<LogoutNotice />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "15 minutos sin actividad",
    );
  });

  it("avisa si el servidor no confirmó, aunque el veredicto llegue con el login ya montado", () => {
    setLogoutNotice({ reason: "user", serverConfirmed: true });
    render(<LogoutNotice />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    act(() => setLogoutNotice({ reason: "user", serverConfirmed: false }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "el servidor no confirmó el cierre",
    );
  });

  it("se enseña una sola vez", () => {
    setLogoutNotice({ reason: "idle", serverConfirmed: true });
    const primero = render(<LogoutNotice />);
    primero.unmount();
    const { container } = render(<LogoutNotice />);
    expect(container).toBeEmptyDOMElement();
  });
});
