import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/shared/auth/auth-context";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import {
  TutorialProvider,
  useTutorial,
} from "@/features/qa-tutorials/tutorial-provider";
import { createTestQueryClient } from "../../../helpers/render-with-providers";
import { makeSession, makeUser } from "../../../helpers/session-fixtures";

const { usePathname, push } = vi.hoisted(() => ({
  usePathname: vi.fn(() => "/internal/qa/suites"),
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname,
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@/shared/auth/auth-service", () => ({
  logoutInternal: vi.fn(),
  loginInternal: vi.fn(),
  getInternalMe: vi.fn(),
}));

const putBodies: unknown[] = [];

beforeEach(() => {
  putBodies.length = 0;
  setStoredInternalSession(makeSession({ user: makeUser({ id: "usr_9" }) }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        putBodies.push(JSON.parse(String(init.body)));
        return jsonResponse({ items: [] });
      }
      return jsonResponse({ items: [] });
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

function jsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
  } as Response;
}

function Harness() {
  const { start } = useTutorial();
  const [showForm, setShowForm] = useState(false);
  return (
    <div>
      <button onClick={() => start("qa-suites-list")}>arrancar</button>
      <div data-tutorial-id="qa-suites-table">tabla</div>
      <button
        data-tutorial-id="qa-suites-new"
        onClick={() => setShowForm(true)}
      >
        Nueva suite
      </button>
      {showForm ? <div data-tutorial-id="qa-suite-form">formulario</div> : null}
    </div>
  );
}

function renderHarness() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <TutorialProvider>
          <Harness />
        </TutorialProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("recorrido interactivo · reactividad y persistencia", () => {
  it("arranca, avanza y reacciona a una acción real del usuario", async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole("button", { name: "arrancar" }));

    // Paso 1: overlay visible con el primer paso.
    expect(screen.getByTestId("tutorial-overlay")).toBeInTheDocument();
    expect(await screen.findByText("¿Qué es una suite?")).toBeInTheDocument();

    // Avanza dos pasos con "Siguiente".
    await user.click(screen.getByRole("button", { name: /Siguiente paso/i }));
    expect(
      await screen.findByText("Tus suites registradas"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Siguiente paso/i }));
    expect(await screen.findByText("Crea una suite nueva")).toBeInTheDocument();

    // Paso reactivo: el tutorial espera a que aparezca el formulario. Al pulsar
    // la acción REAL de la app (que renderiza el form), debe avanzar solo.
    await user.click(screen.getByRole("button", { name: "Nueva suite" }));
    expect(await screen.findByText("Rellena los datos")).toBeInTheDocument();
  });

  it("guarda el progreso completado en el backend al finalizar", async () => {
    const user = userEvent.setup();
    renderHarness();
    // El formulario existe desde el inicio: el paso reactivo se satisface solo.
    await user.click(screen.getByRole("button", { name: "Nueva suite" }));
    await user.click(screen.getByRole("button", { name: "arrancar" }));

    // Avanza hasta el final sin depender del número exacto de pasos (el paso
    // reactivo puede auto-avanzar al detectar el formulario).
    for (let i = 0; i < 8; i += 1) {
      if (screen.queryByText("¡Tutorial completado!")) break;
      const finish = screen.queryByRole("button", { name: /Finalizar/i });
      const next = screen.queryByRole("button", { name: /Siguiente paso/i });
      if (finish) await user.click(finish);
      else if (next) await user.click(next);
      else break;
    }

    expect(
      await screen.findByText("¡Tutorial completado!"),
    ).toBeInTheDocument();
    await waitFor(() => {
      const statuses = putBodies.map(
        (body) => (body as { progress: { status: string } }).progress.status,
      );
      expect(statuses).toContain("completed");
    });
  });

  it("permite omitir el tutorial sin bloquear la plataforma", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByRole("button", { name: "arrancar" }));
    await screen.findByText("¿Qué es una suite?");

    await user.click(screen.getByRole("button", { name: "Omitir tutorial" }));
    await waitFor(() =>
      expect(screen.queryByTestId("tutorial-overlay")).not.toBeInTheDocument(),
    );
    // La app sigue usable.
    expect(screen.getByText("tabla")).toBeInTheDocument();
    const statuses = putBodies.map(
      (body) => (body as { progress: { status: string } }).progress.status,
    );
    expect(statuses).toContain("skipped");
  });
});
