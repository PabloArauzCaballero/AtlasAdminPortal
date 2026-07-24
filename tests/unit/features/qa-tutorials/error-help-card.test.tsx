import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/shared/auth/auth-context";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import { TutorialProvider } from "@/features/qa-tutorials/tutorial-provider";
import { ErrorHelpCard } from "@/features/qa-tutorials/error-help-card";
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

function renderCard(props: Parameters<typeof ErrorHelpCard>[0]) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <TutorialProvider>
          <ErrorHelpCard {...props} />
        </TutorialProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("ErrorHelpCard", () => {
  it("traduce un error conocido a explicación didáctica", () => {
    renderCard({ code: "HTTP_401" });
    expect(screen.getByText("La API pidió autenticación")).toBeInTheDocument();
    expect(screen.getByText(/Posibles causas/i)).toBeInTheDocument();
    expect(screen.getByText(/Cómo corregirlo/i)).toBeInTheDocument();
    expect(screen.getByText(/Acción recomendada:/i)).toBeInTheDocument();
    expect(screen.getByText(/Código: HTTP_401/)).toBeInTheDocument();
  });

  it("abre el tutorial en el paso relacionado", async () => {
    const user = userEvent.setup();
    renderCard({ code: "HTTP_401" });
    await user.click(
      screen.getByRole("button", { name: /Abrir tutorial para corregirlo/i }),
    );
    expect(screen.getByTestId("tutorial-overlay")).toBeInTheDocument();
  });

  it("despliega el detalle técnico sin ocultar información", async () => {
    const user = userEvent.setup();
    renderCard({ code: "HTTP_500", technicalDetail: "stack trace interno" });
    expect(screen.queryByText("stack trace interno")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Ver detalle técnico/i }),
    );
    expect(screen.getByText("stack trace interno")).toBeInTheDocument();
  });

  it("con un código no catalogado muestra el detalle técnico crudo", () => {
    renderCard({ code: "RARO_999", technicalDetail: "detalle crudo" });
    expect(
      screen.getByText(/Ocurrió un error \(RARO_999\)/),
    ).toBeInTheDocument();
    expect(screen.getByText("detalle crudo")).toBeInTheDocument();
  });
});
