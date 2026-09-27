import { HttpResponse, http } from "msw";
import { screen, waitFor, within } from "@testing-library/react";
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

const { LoanDetailPage } = await import("@/features/loans/loan-detail-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

type Llamada = {
  metodo: string;
  ruta: string;
  cuerpo: unknown;
  llave: string | null;
};
const llamadas: Llamada[] = [];

function comoRoles(roles: string[]) {
  mockUseAuth.mockReturnValue({
    permissions: [],
    roles,
    hasAnyRole: (req: string[]) => req.some((r) => roles.includes(r)),
    hasPermission: () => false,
  });
}

const PRESTAMO = {
  loanId: "77",
  loanCode: "LOAN-77",
  customerId: "12",
  creditApplicationId: "5",
  currencyCode: "BOB",
  principalAmount: "1200.00",
  annualInterestRate: "24.0000",
  termMonths: 3,
  status: "active",
  disbursedAt: "2026-08-01T12:00:00.000Z",
  firstDueDate: "2026-09-01",
  maturityDate: "2026-11-01",
  paidPrincipal: "400.00",
  paidInterest: "24.00",
  paidLateFee: "0.00",
  outstandingPrincipal: "800.00",
  daysPastDue: 3,
  worstDaysPastDue: 3,
  delinquencyBucket: "1-30",
  writtenOffAt: null,
  writtenOffAmount: null,
  decision: { executionId: "exe-1", artifactVersionId: "v1" },
  merchant: {
    partnerProfileId: "3",
    displayName: "Tienda Sol",
    businessCategory: null,
  },
  schedule: [
    {
      installmentId: "1",
      installmentNumber: 1,
      dueDate: "2026-09-01",
      principalAmount: "400.00",
      interestAmount: "24.00",
      lateFeeAmount: "0.00",
      paidPrincipal: "400.00",
      paidInterest: "24.00",
      paidLateFee: "0.00",
      status: "paid",
      daysPastDue: 0,
      settledAt: "2026-09-01T00:00:00.000Z",
    },
    {
      installmentId: "2",
      installmentNumber: 2,
      dueDate: "2026-10-01",
      principalAmount: "400.00",
      interestAmount: "16.00",
      lateFeeAmount: "0.00",
      paidPrincipal: "0.00",
      paidInterest: "0.00",
      paidLateFee: "0.00",
      status: "pending",
      daysPastDue: 0,
      settledAt: null,
    },
  ],
  payments: [
    {
      paymentId: "901",
      paymentCode: "PAY-901",
      amount: "424.00",
      currencyCode: "BOB",
      paymentMethod: "bank_transfer",
      externalReference: "TRX-1",
      receivedAt: "2026-09-01T10:00:00.000Z",
      status: "applied",
      reversedAt: null,
      reversalReasonCode: null,
    },
    {
      paymentId: "902",
      paymentCode: "PAY-902",
      amount: "10.00",
      currencyCode: "BOB",
      paymentMethod: "cash",
      externalReference: null,
      receivedAt: "2026-09-02T10:00:00.000Z",
      status: "reversed",
      reversedAt: "2026-09-03T10:00:00.000Z",
      reversalReasonCode: "duplicate_payment",
    },
  ],
  history: [],
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
});

beforeEach(() => {
  llamadas.length = 0;
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  comoRoles(["admin"]);
  const anotar = async (request: Request) => {
    llamadas.push({
      metodo: request.method,
      ruta: new URL(request.url).pathname.replace("/api/v1", ""),
      cuerpo: request.method === "GET" ? null : await request.json(),
      llave: request.headers.get("x-idempotency-key"),
    });
  };
  server.use(
    http.get(`${API_BASE}/loans/77`, () =>
      HttpResponse.json({ data: PRESTAMO }),
    ),
    http.get(`${API_BASE}/operations/loans/77/rating`, () =>
      HttpResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "LOAN_RATING_NOT_FOUND" },
        },
        { status: 404 },
      ),
    ),
    http.get(`${API_BASE}/operations/loans/77/rating-history`, () =>
      HttpResponse.json({ data: { loanId: "77", items: [] } }),
    ),
    http.post(`${API_BASE}/loans/77/payments`, async ({ request }) => {
      await anotar(request);
      return HttpResponse.json(
        {
          data: {
            paymentId: "903",
            paymentCode: "PAY-903",
            duplicated: false,
            loanStatus: "active",
          },
        },
        { status: 201 },
      );
    }),
    http.post(`${API_BASE}/loans/77/write-off`, async ({ request }) => {
      await anotar(request);
      return HttpResponse.json({
        data: {
          loanId: "77",
          status: "written_off",
          writtenOffAmount: "800.00",
        },
      });
    }),
    http.post(
      `${API_BASE}/loans/77/payments/901/reversal`,
      async ({ request }) => {
        await anotar(request);
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: "CONFLICT",
              message: "LOAN_PAYMENT_ALREADY_REVERSED",
            },
          },
          { status: 409 },
        );
      },
    ),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

async function abrirFicha() {
  renderWithProviders(<LoanDetailPage loanId="77" />);
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "Préstamo LOAN-77" }),
    ).toBeInTheDocument(),
  );
}

describe("LoanDetailPage — ficha del préstamo y sus operaciones", () => {
  it("pinta el calendario, los cobros y la calificación pendiente como vacío, no como error", async () => {
    await abrirFicha();
    expect(screen.getByText("PAY-901")).toBeInTheDocument();
    expect(screen.getByText("Tienda Sol")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getAllByText("Todavía sin calificar.").length,
      ).toBeGreaterThan(0),
    );
    // Sólo el cobro aplicado se puede reversar; el reversado ya no ofrece el botón.
    expect(screen.getAllByRole("button", { name: "Reversar" })).toHaveLength(1);
  });

  it("registra un cobro con la moneda del préstamo y una llave de idempotencia", async () => {
    const user = userEvent.setup();
    await abrirFicha();
    await user.click(screen.getByRole("button", { name: "Registrar cobro" }));
    const panel = await screen.findByRole("dialog");
    await user.type(within(panel).getByLabelText(/Importe/), "416.00");
    await user.click(
      within(panel).getByRole("button", { name: "Registrar cobro" }),
    );

    await waitFor(() =>
      expect(within(panel).getByRole("status")).toHaveTextContent("PAY-903"),
    );
    const cobro = llamadas.find((l) => l.ruta === "/loans/77/payments");
    expect(cobro?.cuerpo).toEqual({
      amount: "416.00",
      currencyCode: "BOB",
      paymentMethod: "bank_transfer",
    });
    expect(cobro?.llave).toBeTruthy();
  });

  it("castigar exige motivo, explicación y teclear el código del préstamo", async () => {
    const user = userEvent.setup();
    await abrirFicha();
    await user.click(screen.getByRole("button", { name: "Castigar" }));
    const panel = await screen.findByRole("dialog");

    await user.click(
      within(panel).getByRole("button", { name: "Castigar préstamo" }),
    );
    expect(
      await within(panel).findByText(/Elige el motivo/),
    ).toBeInTheDocument();
    expect(llamadas).toHaveLength(0);

    await elegirOpcion(
      within(panel).getByRole("combobox", { name: /Motivo/ }),
      "incobrable",
    );
    await user.type(
      within(panel).getByLabelText(/Explicación/),
      "Gestión agotada",
    );
    await user.click(
      within(panel).getByRole("button", { name: "Castigar préstamo" }),
    );

    const confirmacion = await screen.findByRole("dialog", {
      name: "¿Castigar este préstamo?",
    });
    const confirmar = within(confirmacion).getByRole("button", {
      name: "Castigar préstamo",
    });
    expect(confirmar).toBeDisabled();
    await user.type(within(confirmacion).getByRole("textbox"), "LOAN-77");
    await user.click(confirmar);

    await waitFor(() =>
      expect(
        llamadas.find((l) => l.ruta === "/loans/77/write-off")?.cuerpo,
      ).toEqual({
        reasonCode: "incobrable",
        notes: "Gestión agotada",
      }),
    );
  });

  it("un reverso rechazado se explica en español, con el código traducido", async () => {
    const user = userEvent.setup();
    await abrirFicha();
    await user.click(screen.getByRole("button", { name: "Reversar" }));
    const panel = await screen.findByRole("dialog");
    await elegirOpcion(
      within(panel).getByRole("combobox", { name: /Motivo/ }),
      "chargeback",
    );
    await user.click(
      within(panel).getByRole("button", { name: "Reversar cobro" }),
    );
    const confirmacion = await screen.findByRole("dialog", {
      name: "¿Reversar este cobro?",
    });
    await user.click(
      within(confirmacion).getByRole("button", { name: "Reversar cobro" }),
    );

    expect(
      await screen.findByText("Ese cobro ya estaba reversado."),
    ).toBeInTheDocument();
    expect(llamadas.find((l) => l.ruta.endsWith("/reversal"))?.cuerpo).toEqual({
      reasonCode: "chargeback",
    });
  });

  it("sin rol de administración no se ofrece castigar; un analista de riesgo sólo lee", async () => {
    comoRoles(["risk_analyst"]);
    await abrirFicha();
    expect(screen.queryByRole("button", { name: "Castigar" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Registrar cobro" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Reversar" })).toBeNull();
  });
});
