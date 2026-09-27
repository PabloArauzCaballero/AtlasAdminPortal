import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

/**
 * Las colas por cursor: cada «Cargar más» pide la página siguiente con el cursor que devolvió la
 * anterior, y la fila se decide con el mismo diálogo que la cola combinada.
 */
vi.mock("@/features/operations-cases/customer-actions-services", () => ({
  listCasesByCursor: vi.fn(),
}));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({ permissions: [], roles: [], user: null }),
}));

const services =
  await import("@/features/operations-cases/customer-actions-services");
const { CaseQueuePage } =
  await import("@/features/operations-cases/case-queue-page");

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function fila(caseId: string, caseCode: string) {
  return {
    workItemType: "fraud" as const,
    caseId,
    caseCode,
    customerId: "900",
    priority: "high",
    status: "open",
    reasonCode: "velocity",
    decisionExecutionId: null,
    openedAt: null,
    createdAt: "2026-09-26T10:00:00.000Z",
  };
}

describe("CaseQueuePage", () => {
  it("pagina por cursor y deja de ofrecer más al acabar", async () => {
    vi.mocked(services.listCasesByCursor).mockImplementation(
      async (_queue, query) =>
        query.cursor === "c1"
          ? { items: [fila("2", "FR-2")], nextCursor: null }
          : { items: [fila("1", "FR-1")], nextCursor: "c1" },
    );
    render(<CaseQueuePage queue="fraud" />, { wrapper });
    await waitFor(() => expect(screen.getByText("FR-1")).toBeInTheDocument());
    expect(services.listCasesByCursor).toHaveBeenCalledWith("fraud", {
      status: "",
      priority: "",
      customerId: "",
      limit: 20,
    });
    fireEvent.click(screen.getByTestId("case-queue-more"));
    await waitFor(() => expect(screen.getByText("FR-2")).toBeInTheDocument());
    expect(services.listCasesByCursor).toHaveBeenLastCalledWith("fraud", {
      status: "",
      priority: "",
      customerId: "",
      limit: 20,
      cursor: "c1",
    });
    expect(screen.queryByTestId("case-queue-more")).not.toBeInTheDocument();
    expect(
      screen.getByText(/No hay más casos: 2 en total/),
    ).toBeInTheDocument();
  });
});
