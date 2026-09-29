import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  IdempotencyFindingsTable,
  QualityFindingsTable,
  RetentionCandidatesTable,
  SanitizationFindingsTable,
} from "@/features/external-providers-admin/audit/findings-tables";
import {
  GateProvidersTable,
  ReadinessProvidersTable,
  SlaProvidersTable,
} from "@/features/external-providers-admin/audit/provider-tables";
import { ProviderActivityTable } from "@/features/external-providers-admin/dashboard/provider-activity-table";
import { RecentRequestsTable } from "@/features/external-providers-admin/dashboard/recent-requests-table";
import { ProvidersCatalogTable } from "@/features/external-providers-admin/providers-catalog-table";
import { buildProviderColumns } from "@/features/external-providers-admin/provider-columns";
import type {
  CostPolicy,
  DashboardProvider,
  ProviderRequestRow,
} from "@/features/external-providers-admin/types";
import {
  buscar,
  cabeceras,
  esperarFilas,
  esTablaHomogenea,
  filasDeDatos,
  filtrarPor,
} from "../../shared/tabla-helpers";

const policies = vi.hoisted(() => ({ data: [] as unknown[] }));
vi.mock("@/features/external-providers-admin/hooks", () => ({
  useProviderCostPolicies: () => ({
    isLoading: false,
    error: null,
    data: policies.data,
    refetch: vi.fn(),
  }),
  useUpdateCostPolicyMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

describe("Auditorías de proveedores · hallazgos en tabla", () => {
  it("consultas repetidas: gravedad y búsqueda recortan", async () => {
    render(
      <IdempotencyFindingsTable
        findings={[
          {
            severity: "CRITICAL",
            code: "IDEMPOTENCY_KEY_REUSED",
            keyHash: "k1",
            occurrences: 3,
            requestIds: ["101", "102"],
          },
          {
            severity: "LOW",
            code: "IDEMPOTENCY_KEY_REUSED",
            keyHash: "k2",
            occurrences: 2,
            requestIds: ["205"],
          },
        ]}
      />,
    );
    esTablaHomogenea(
      ["Gravedad", "Qué pasó", "Veces", "Solicitudes"],
      /Buscar por lo que pasó o por solicitud/,
    );
    await filtrarPor(/^Gravedad/, "LOW");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("205");
    await filtrarPor(/^Gravedad/, "");
    await buscar(/Buscar por lo que pasó o por solicitud/, "102");
    await esperarFilas(1);
  });

  it("datos sensibles sin tachar y candidatas a purga van en tabla", async () => {
    const { unmount } = render(
      <SanitizationFindingsTable
        findings={[
          {
            severity: "HIGH",
            responseId: "r1",
            providerRequestId: "p1",
            code: "X",
            key: "access_token",
          },
          {
            severity: "MEDIUM",
            responseId: "r2",
            providerRequestId: "p2",
            code: "X",
            key: "password",
          },
        ]}
      />,
    );
    expect(cabeceras()).toEqual([
      "Gravedad",
      "Clave encontrada",
      "Respuesta",
      "Solicitud",
    ]);
    await buscar(/Buscar por clave, respuesta o solicitud/, "password");
    await esperarFilas(1);
    unmount();
    render(
      <RetentionCandidatesTable
        candidates={[
          {
            requestId: "1",
            customerId: "10",
            responseStatus: "COMPLETED",
            action: "purgar",
          },
          {
            requestId: "2",
            customerId: "11",
            responseStatus: "FAILED",
            action: "purgar",
          },
        ]}
      />,
    );
    expect(cabeceras()).toEqual([
      "Solicitud",
      "Cliente",
      "Cuándo se pidió",
      "Cómo acabó",
      "Qué se haría",
    ]);
    await filtrarPor(/^Cómo acabó/, "FAILED");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("11");
  });

  it("calidad: filtra por gravedad y por proveedor y ordena por gravedad", async () => {
    render(
      <QualityFindingsTable
        findings={[
          {
            severity: "LOW",
            providerCode: "SEGIP",
            code: "NO_COST_POLICY",
            message: "sin política",
          },
          {
            severity: "CRITICAL",
            providerCode: "ASFI",
            code: "NO_COST_POLICY",
            message: "crítico",
          },
          { severity: "HIGH", code: "NO_COST_POLICY", message: "general" },
        ]}
      />,
    );
    expect(cabeceras()).toEqual([
      "Gravedad",
      "Proveedor",
      "Qué pasa",
      "Qué hacer",
    ]);
    expect(filasDeDatos()[0]).toHaveTextContent("ASFI");
    await filtrarPor(/^Proveedor/, "General");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("general");
  });
});

describe("Auditorías de proveedores · informes por proveedor en tabla", () => {
  it("compuerta: filtra por si sirve para producción", async () => {
    render(
      <GateProvidersTable
        providers={[
          {
            providerCode: "SEGIP",
            mode: "production",
            healthStatus: "UP",
            readyForMock: true,
            readyForProduction: true,
            blockers: [],
          },
          {
            providerCode: "ASFI",
            mode: "mock_server",
            healthStatus: "DOWN",
            readyForMock: true,
            readyForProduction: false,
            blockers: ["ASFI_NO_COST_POLICY"],
          },
        ]}
      />,
    );
    esTablaHomogenea(
      [
        "Proveedor",
        "Cómo se le llama",
        "Salud",
        "Sirve simulado",
        "Sirve producción",
        "Bloqueos",
      ],
      /Buscar por proveedor o bloqueo/,
    );
    await filtrarPor(/^Sirve producción/, "no");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("ASFI");
    await filtrarPor(/^Sirve producción/, "");
    await filtrarPor(/^Salud/, "UP");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("SEGIP");
  });

  it("preparación y cumplimiento van en tabla con filtros", async () => {
    const item = (
      providerCode: string,
      status: string,
      mode: string,
      health: string,
    ) => ({
      providerCode,
      name: providerCode,
      category: null,
      status,
      mode,
      health: {
        status: health,
        latencyMs: 1,
        checkedAt: "2026-09-29T00:00:00Z",
      },
      policies: [],
      recentFailures: 0,
      readyForMock: true,
      readyForProduction: false,
      blockers: [],
    });
    const { unmount } = render(
      <ReadinessProvidersTable
        items={[
          item("SEGIP", "ACTIVE", "production", "UP"),
          item("ASFI", "MOCK_ONLY", "mock_local", "UNKNOWN"),
        ]}
      />,
    );
    expect(cabeceras()).toEqual([
      "Proveedor",
      "Tipo",
      "Cómo se le llama",
      "Salud",
      "Políticas",
      "Fallos recientes",
      "Qué le falta",
    ]);
    await filtrarPor(/^Tipo/, "MOCK_ONLY");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("ASFI");
    unmount();
    render(
      <SlaProvidersTable
        providers={[
          {
            providerCode: "SEGIP",
            total: 10,
            success: 10,
            failed: 0,
            blocked: 0,
            cached: 0,
            rateLimited: 0,
            authFailed: 0,
            successRate: 100,
            failureRate: 0,
            p95LatencyMs: 12,
            actualCost: 0,
            warnings: [],
          },
          {
            providerCode: "ASFI",
            total: 4,
            success: 2,
            failed: 2,
            blocked: 0,
            cached: 0,
            rateLimited: 0,
            authFailed: 0,
            successRate: 50,
            failureRate: 50,
            p95LatencyMs: null,
            actualCost: 0,
            warnings: ["MUCHOS_FALLOS"],
          },
        ]}
      />,
    );
    expect(cabeceras()).toEqual([
      "Proveedor",
      "Llamadas",
      "Éxito",
      "Fallos",
      "Bloqueadas",
      "Límite",
      "Credencial",
      "p95",
      "Costo",
    ]);
    await filtrarPor(/^Avisos/, "yes");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("ASFI");
  });
});

const dash = (
  code: string,
  mode: string,
  total: number,
  error: string | null,
): DashboardProvider => ({
  providerCode: code,
  name: code,
  category: null,
  status: "ACTIVE",
  mode,
  isCostly: false,
  requiresManualApproval: false,
  health: {
    status: "UP",
    latencyMs: mode === "mock_server" ? 12 : 0,
    checkedAt: "2026-09-29T00:00:00Z",
    modeChecked: mode,
    errorCode: null,
    errorMessageSafe: null,
  },
  healthSeries: [],
  activity: {
    total,
    success: total,
    failed: 0,
    blocked: 0,
    cached: 0,
    successRate: total ? 100 : null,
    p95LatencyMs: total ? 10 : null,
    avgLatencyMs: null,
    estimatedCost: 0,
    actualCost: 0,
    lastRequestAt: null,
    lastErrorStatus: error,
    lastErrorMessage: null,
  },
});

describe("Tablero de proveedores", () => {
  it("la actividad por proveedor es una tabla (ya no una tarjeta por proveedor) con acción Simular", async () => {
    const onSimulate = vi.fn();
    render(
      <ProviderActivityTable
        providers={[
          dash("SEGIP", "mock_server", 5, null),
          dash("ASFI", "production", 0, "FAILED"),
        ]}
        onSimulate={onSimulate}
      />,
    );
    esTablaHomogenea(
      [
        "Proveedor",
        "Modo",
        "Salud",
        "Latencia reciente",
        "Llamadas",
        "Éxito",
        "Latencia p95",
        "Última llamada",
        "Último error",
        "Acciones",
      ],
      /Buscar por proveedor, nombre o error/,
    );
    await userEvent.click(
      within(filasDeDatos()[0]!).getByRole("button", { name: /simular/i }),
    );
    expect(onSimulate).toHaveBeenCalledWith(
      expect.objectContaining({ providerCode: "SEGIP" }),
    );
    await filtrarPor(/^Último error/, "yes");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("ASFI");
    await filtrarPor(/^Último error/, "");
    await filtrarPor(/^Salud/, "NOT_MEASURED");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("ASFI");
  });

  it("las últimas llamadas van en tabla con filtro de resultado", async () => {
    const req = (requestId: string, status: string): ProviderRequestRow => ({
      requestId,
      providerCode: "SEGIP",
      customerId: null,
      requestType: "IDENTITY_VERIFICATION",
      purposeCode: null,
      decisionStage: null,
      modeUsed: null,
      responseStatus: status,
      responseCode: null,
      approvalStatus: null,
      latencyMs: 20,
      estimatedCostAmount: null,
      actualCostAmount: null,
      currency: null,
      errorMessageSafe: null,
      requestedAt: "2026-09-29T00:00:00Z",
      respondedAt: null,
    });
    render(
      <RecentRequestsTable
        requests={[req("1", "COMPLETED"), req("2", "FAILED")]}
      />,
    );
    expect(cabeceras()).toEqual([
      "Cuándo",
      "Proveedor",
      "Qué se pidió",
      "Resultado",
      "Tardó",
    ]);
    await filtrarPor(/^Resultado/, "FAILED");
    await esperarFilas(1);
  });

  it("el catálogo se filtra por tipo y por costo", async () => {
    const prov = (code: string, status: string, isCostly: boolean) => ({
      id: code,
      code,
      name: code,
      category: "KYC",
      status,
      defaultMode: "mock_local",
      requiresConsent: false,
      requiresManualApproval: false,
      isCostly,
      description: null,
    });
    render(
      <ProvidersCatalogTable
        rows={[
          prov("SEGIP", "ACTIVE", false),
          prov("INFOCENTER", "MOCK_ONLY", true),
        ]}
        columns={buildProviderColumns(() => undefined)}
      />,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    await filtrarPor(/^Costoso/, "yes");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("INFOCENTER");
  });
});

describe("Políticas de costo de un proveedor", () => {
  const politica = (
    id: string,
    queryType: string,
    active: boolean,
    costTier: CostPolicy["costTier"],
  ): CostPolicy => ({
    id,
    providerId: "p",
    queryType,
    unitCostAmount: 1,
    currency: "USD",
    costTier,
    maxQueriesPerUserPerDay: 3,
    maxQueriesPerUserPerMonth: null,
    maxQueriesGlobalPerDay: 100,
    allowedDecisionStagesJson: [],
    requiresManualApproval: false,
    requiresAdminRole: false,
    blockByDefault: false,
    cacheTtlSeconds: null,
    featureTtlSeconds: null,
    retryMaxAttempts: null,
    retryBackoffSeconds: null,
    active,
  });

  it("van en tabla, se filtran y Editar abre el formulario de esa política", async () => {
    policies.data = [
      politica("a", "IDENTITY_VERIFICATION", true, "LOW"),
      politica("b", "CREDIT_REPORT", false, "HIGH"),
    ];
    const { ProviderCostPoliciesSection } =
      await import("@/features/external-providers-admin/provider-cost-policies-section");
    render(<ProviderCostPoliciesSection providerCode="SEGIP" />);
    expect(cabeceras()).toEqual([
      "Consulta",
      "Estado",
      "Nivel de costo",
      "Reglas",
      "Costo por consulta",
      "Máx./día usuario",
      "Máx./día global",
      "Acciones",
    ]);
    await filtrarPor(/^Estado/, "no");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("Informe de buró de crédito");
    await userEvent.click(
      within(filasDeDatos()[0]!).getByRole("button", { name: /editar/i }),
    );
    expect(
      screen.getByText(/Editando: Informe de buró de crédito/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /guardar política/i }),
    ).toBeInTheDocument();
  });

  it("un proveedor sin políticas lo explica", async () => {
    policies.data = [];
    const { ProviderCostPoliciesSection } =
      await import("@/features/external-providers-admin/provider-cost-policies-section");
    render(<ProviderCostPoliciesSection providerCode="SEGIP" />);
    expect(
      screen.getByText(
        "Este proveedor no tiene políticas de costo configuradas.",
      ),
    ).toBeInTheDocument();
  });
});
