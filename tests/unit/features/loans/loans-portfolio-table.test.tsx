import { HttpResponse, http } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { elegirOpcion } from "../../shared/option-select-helpers";

const mockUseAuth = vi.fn();
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

const { LoansPortfolioTable } =
  await import("@/features/loans/loans-portfolio-table");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const consultas: Record<string, string>[] = [];

function comoRoles(roles: string[]) {
  mockUseAuth.mockReturnValue({
    permissions: [],
    roles,
    hasAnyRole: (req: string[]) => req.some((r) => roles.includes(r)),
    hasPermission: () => false,
  });
}

const prestamo = (n: number) => ({
  loanId: String(n),
  loanCode: `LOAN-${n}`,
  customerId: "12",
  creditApplicationId: String(n),
  currencyCode: "BOB",
  principalAmount: "1000.00",
  annualInterestRate: "24.0000",
  termMonths: 3,
  status: "active",
  disbursedAt: "2026-08-01T12:00:00.000Z",
  firstDueDate: "2026-09-01",
  maturityDate: "2026-11-01",
  paidPrincipal: "0.00",
  paidInterest: "0.00",
  paidLateFee: "0.00",
  outstandingPrincipal: "1000.00",
  daysPastDue: 0,
  worstDaysPastDue: 0,
  delinquencyBucket: "current",
  writtenOffAt: null,
  writtenOffAmount: null,
  decision: { executionId: null, artifactVersionId: null },
  merchant: null,
});

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
});

beforeEach(() => {
  consultas.length = 0;
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  comoRoles(["internal_operator"]);
  server.use(
    http.get(`${API_BASE}/operations/loans`, ({ request }) => {
      const params = Object.fromEntries(new URL(request.url).searchParams);
      consultas.push(params);
      const page = Number(params.page);
      return HttpResponse.json({
        data: {
          items: [prestamo(page * 100 + 1)],
          total: 60,
          page,
          pageSize: Number(params.pageSize),
        },
      });
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

describe("LoansPortfolioTable — la cartera paginada en el servidor", () => {
  it("pide la primera página sin filtros vacíos y enlaza a la ficha y al cliente", async () => {
    renderWithProviders(<LoansPortfolioTable />);
    expect(await screen.findByText("LOAN-101")).toBeInTheDocument();
    expect(consultas[0]).toEqual({ page: "1", pageSize: "25" });
    expect(screen.getByText("60 préstamos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir" })).toHaveAttribute(
      "href",
      "/internal/operations/loans/101",
    );
    expect(screen.getByRole("link", { name: "#12" })).toHaveAttribute(
      "href",
      "/internal/operations/customers/12/investigation-summary",
    );
  });

  it("filtrar por estado y tramo manda los códigos y vuelve a la página 1", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoansPortfolioTable />);
    await screen.findByText("LOAN-101");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    await screen.findByText("LOAN-201");

    await elegirOpcion(
      screen.getByRole("combobox", { name: /Estado/ }),
      "written_off",
    );
    await elegirOpcion(
      screen.getByRole("combobox", { name: /Tramo de mora/ }),
      "dpd_90_plus",
    );
    await waitFor(() =>
      expect(consultas.at(-1)).toEqual({
        status: "written_off",
        delinquencyBucket: "dpd_90_plus",
        page: "1",
        pageSize: "25",
      }),
    );
  });

  it("busca por PARTE del código de préstamo o de cliente con `q` (antes: loanCode exacto)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoansPortfolioTable />);
    await screen.findByText("LOAN-101");
    await user.type(
      screen.getByRole("textbox", { name: /código de préstamo o de cliente/i }),
      " cus-12 ",
    );
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ q: "cus-12", page: "1" }),
    );
    expect(consultas.at(-1)).not.toHaveProperty("loanCode");
  });

  it("cumplimiento lista la cartera pero no ve «Abrir»: la ficha le respondería 403", async () => {
    comoRoles(["compliance_analyst"]);
    renderWithProviders(<LoansPortfolioTable />);
    expect(await screen.findByText("LOAN-101")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Abrir" })).toBeNull();
  });
});
