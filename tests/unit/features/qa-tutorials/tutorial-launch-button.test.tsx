import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/shared/auth/auth-context";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import { TutorialProvider } from "@/features/qa-tutorials/tutorial-provider";
import { TutorialLaunchButton } from "@/features/qa-tutorials/tutorial-launch-button";
import { createTestQueryClient } from "../../../helpers/render-with-providers";
import { makeSession } from "../../../helpers/session-fixtures";

const { usePathname } = vi.hoisted(() => ({
  usePathname: vi.fn(() => "/internal/qa/lab"),
}));
vi.mock("next/navigation", () => ({
  usePathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@/shared/auth/auth-service", () => ({
  logoutInternal: vi.fn(),
  loginInternal: vi.fn(),
  getInternalMe: vi.fn(),
}));

beforeEach(() => {
  setStoredInternalSession(makeSession());
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({ items: [] }),
        }) as Response,
    ),
  );
});
afterEach(() => vi.unstubAllGlobals());

function renderButton(props: { variant?: "full" | "compact" } = {}) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <TutorialProvider>
          <TutorialLaunchButton tutorialId="qa-lab-functional" {...props} />
        </TutorialProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("TutorialLaunchButton", () => {
  it("muestra estado 'Disponible' y aria-label accesible", () => {
    renderButton();
    const button = screen.getByRole("button", {
      name: /Iniciar tutorial · Probar un endpoint/i,
    });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Disponible")).toBeInTheDocument();
  });

  it("no rompe si el tutorial no existe", () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <AuthProvider>
          <TutorialProvider>
            <TutorialLaunchButton tutorialId="inexistente" />
          </TutorialProvider>
        </AuthProvider>
      </QueryClientProvider>,
    );
    expect(screen.queryByText("Disponible")).not.toBeInTheDocument();
  });

  it("al pulsarlo arranca el recorrido (aparece el overlay)", async () => {
    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole("button", { name: /Iniciar tutorial/i }));
    expect(screen.getByTestId("tutorial-overlay")).toBeInTheDocument();
  });

  it("variante compacta expone tooltip por title y aria-label", () => {
    renderButton({ variant: "compact" });
    const button = screen.getByRole("button", {
      name: /Iniciar tutorial · Probar un endpoint/i,
    });
    expect(button).toHaveAttribute("title");
  });
});
