import { HttpResponse, http } from "msw";
import { screen } from "@testing-library/react";
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

const mockUseAuth = vi.fn();
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

const { CurrentRiskPolicyPage } =
  await import("@/features/risk-policy/current-risk-policy-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

/** Una regla como las de `risk.risk_policy_rules` en TEST. */
const POLITICA = {
  modelVersions: [],
  rulesetVersions: [
    {
      riskRulesetVersionId: "1",
      rulesetCode: "atlas_mvp_onboarding_ruleset",
      versionCode: "v1-seed",
      assessmentType: "onboarding_credit",
      status: "active",
      effectiveFrom: null,
      effectiveUntil: null,
      rules: [
        {
          riskPolicyRuleId: "7",
          ruleCode: "hold_collection_during_open_dispute",
          ruleName: "Suspender gestión de cobro sobre una compra disputada",
          riskDimension: "servicing",
          ruleType: "bnpl_responsible_lending",
          severity: "critical",
          actionCode: "HOLD_COLLECTION",
          reasonCode: "x",
          isHardStop: false,
        },
      ],
    },
  ],
  riskSignalSeeds: [],
};

function conPermisos(permissions: string[]) {
  mockUseAuth.mockReturnValue({
    permissions,
    roles: [],
    hasAnyRole: () => true,
    hasPermission: (p: string) => permissions.includes(p),
  });
}

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(`${API_BASE}/operations/risk-policy/current`, () =>
      HttpResponse.json({ data: POLITICA }),
    ),
  );
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

describe("CurrentRiskPolicyPage", () => {
  it("abre con el permiso del menú (operations.riskPolicy.read), sin linaje", async () => {
    conPermisos(["operations.riskPolicy.read"]);
    renderWithProviders(<CurrentRiskPolicyPage />);
    expect(
      await screen.findByText(
        "Suspender gestión de cobro sobre una compra disputada",
      ),
    ).toBeInTheDocument();
  });

  it("pinta los códigos en palabras, no en jerga de base de datos", async () => {
    conPermisos(["operations.riskPolicy.read"]);
    renderWithProviders(<CurrentRiskPolicyPage />);
    await screen.findByText("Suspender el cobro");
    expect(screen.getByText("Cobranza")).toBeInTheDocument();
    expect(screen.getByText("Crítica")).toBeInTheDocument();
    expect(screen.getByText("Crédito responsable")).toBeInTheDocument();
    expect(screen.getByText(/Alta con crédito/)).toBeInTheDocument();
    expect(screen.queryByText("HOLD_COLLECTION")).toBeNull();
    expect(screen.queryByText("bnpl_responsible_lending")).toBeNull();
  });

  it("sólo linaje ya no basta: es el permiso de otra pantalla", () => {
    conPermisos(["lineage.read"]);
    renderWithProviders(<CurrentRiskPolicyPage />);
    expect(screen.getByText("Acceso restringido")).toBeInTheDocument();
  });
});
