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

const mockUseAuth = vi.fn();
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

import { elegirOpcion } from "../../shared/option-select-helpers";

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
          riskPolicyRuleId: "8",
          ruleCode: "block_identity_mismatch",
          ruleName: "Bloquear si la identidad no coincide",
          riskDimension: "identity",
          ruleType: "bnpl_responsible_lending",
          severity: "high",
          actionCode: "BLOCK",
          reasonCode: "y",
          isHardStop: true,
        },
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
    expect(screen.getAllByText("Crédito responsable").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText(/Alta con crédito/)).toBeInTheDocument();
    expect(screen.queryByText("HOLD_COLLECTION")).toBeNull();
    expect(screen.queryByText("bnpl_responsible_lending")).toBeNull();
  });

  it("sólo linaje ya no basta: es el permiso de otra pantalla", () => {
    conPermisos(["lineage.read"]);
    renderWithProviders(<CurrentRiskPolicyPage />);
    expect(screen.getByText("Acceso restringido")).toBeInTheDocument();
  });

  it("versiones y reglas son tablas con cabeceras, no tarjetas", async () => {
    conPermisos(["operations.riskPolicy.read"]);
    renderWithProviders(<CurrentRiskPolicyPage />);
    await screen.findByText("Suspender el cobro");
    const [versiones, reglas] = screen.getAllByRole("table");
    expect(
      within(versiones)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(
      expect.arrayContaining(["Ruleset", "Tipo", "Estado", "Desde", "Hasta"]),
    );
    expect(
      within(versiones).getByText("atlas_mvp_onboarding_ruleset@v1-seed"),
    ).toBeInTheDocument();
    expect(
      within(reglas)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(expect.arrayContaining(["Regla", "Dimensión", "Severidad"]));
  });

  it("el buscador y el filtro de severidad recortan las reglas", async () => {
    conPermisos(["operations.riskPolicy.read"]);
    renderWithProviders(<CurrentRiskPolicyPage />);
    await screen.findByText("Suspender el cobro");
    await userEvent.type(
      screen.getByRole("textbox", {
        name: "Buscar por regla, código o ruleset…",
      }),
      "identidad",
    );
    await waitFor(() =>
      expect(
        screen.queryByText(
          "Suspender gestión de cobro sobre una compra disputada",
        ),
      ).toBeNull(),
    );
    expect(
      screen.getByText("Bloquear si la identidad no coincide"),
    ).toBeInTheDocument();
    await userEvent.clear(
      screen.getByRole("textbox", {
        name: "Buscar por regla, código o ruleset…",
      }),
    );
    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Severidad/ }),
      "critical",
    );
    // El vaciado del buscador espera al debounce: primero reaparece la regla crítica.
    expect(
      await screen.findByText(
        "Suspender gestión de cobro sobre una compra disputada",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Bloquear si la identidad no coincide"),
    ).toBeNull();
  });

  it("filtros que nada satisface dicen que ninguna regla coincide", async () => {
    conPermisos(["operations.riskPolicy.read"]);
    renderWithProviders(<CurrentRiskPolicyPage />);
    await screen.findByText("Suspender el cobro");
    await userEvent.type(
      screen.getByRole("textbox", {
        name: "Buscar por regla, código o ruleset…",
      }),
      "zzzz",
    );
    expect(
      await screen.findByText("Ninguna regla coincide con los filtros."),
    ).toBeInTheDocument();
  });
});
