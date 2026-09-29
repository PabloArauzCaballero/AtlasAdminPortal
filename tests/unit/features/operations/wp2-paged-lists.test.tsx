import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { DefinitionsPage } from "@/features/operations/definitions-page";
import { OperationCatalogsPage } from "@/features/operations/catalogs-page";
import { DataGovernancePoliciesPage } from "@/features/operations/data-governance-policies-page";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import { elegirOpcion } from "../../shared/option-select-helpers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    permissions: [
      "operations.definitions.read",
      "operations.catalogs.read",
      "governance.policies.read",
    ],
    roles: [],
    hasPermission: () => true,
  }),
}));

const request = vi.mocked(apiRequest);
const llamadas: Array<{ path: string; query: Record<string, unknown> }> = [];
const meta = (page: unknown) => ({
  page: Number(page ?? 1),
  limit: 20,
  total: 45,
  totalPages: 3,
});

beforeEach(() => {
  llamadas.length = 0;
  request.mockReset();
  request.mockImplementation(async (path, options) => {
    const query = (options?.query ?? {}) as Record<string, unknown>;
    llamadas.push({ path, query });
    if (path === "/operations/definitions")
      return {
        events: [
          {
            eventDefinitionId: "1",
            eventCode: `evt_p${query.page}`,
            eventName: "Pago",
            eventFamily: null,
            sourcePackage: null,
            riskDimension: null,
            isHighVolume: false,
            isActive: true,
            ownerTeam: null,
            domainCode: null,
            reviewStatus: "NEEDS_REVIEW",
            relatedTables: [],
          },
        ],
        observations: [],
        attributes: [],
        features: [],
        meta: meta(query.page),
        summary: {
          total: 45,
          events: 30,
          observations: 5,
          attributes: 6,
          features: 4,
        },
      };
    if (path === "/operations/catalogs")
      return {
        items: [
          {
            catalogId: "1",
            catalogCode: `BANCOS_p${query.page}`,
            catalogName: "Bancos",
            domain: "bancos",
            ownerTeam: "riesgo",
            isActive: true,
            currentVersion: null,
          },
        ],
        meta: meta(query.page),
        summary: { total: 45, active: 40, published: 31, withoutVersion: 2 },
      };
    return {
      items: [
        {
          policyId: "purpose:12",
          type: "purpose",
          code: `MKT_p${query.page}`,
          name: "Marketing",
          scope: "consentimiento",
          isActive: true,
          attributes: { requiresExplicitConsent: true },
        },
      ],
      meta: meta(query.page),
      summary: {
        total: 45,
        byType: { purpose: 3 },
        sensitiveFields: 11,
        explicitConsent: 2,
        protectedClasses: 4,
      },
    };
  });
});

describe("Definiciones del motor (L7)", () => {
  it("q viaja (una letra no rompe), pagina en servidor y las tarjetas salen del summary", async () => {
    renderWithProviders(<DefinitionsPage />);
    expect(
      await screen.findByRole("heading", { name: "Definiciones del motor" }),
    ).toBeInTheDocument();
    await screen.findByText("evt_p1");
    expect(screen.getByText("Eventos").parentElement).toHaveTextContent("30");
    fireEvent.change(
      screen.getByRole("textbox", { name: /código o nombre/i }),
      { target: { value: "p" } },
    );
    await waitFor(() =>
      expect(llamadas.at(-1)?.query).toMatchObject({
        q: "p",
        page: 1,
        limit: 20,
      }),
    );
    expect(llamadas.at(-1)?.query).not.toHaveProperty("domain");
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("evt_p2")).toBeInTheDocument();
  });
});

describe("Catálogos operativos (P2)", () => {
  it("q multicampo, paginado y tarjetas del summary", async () => {
    renderWithProviders(<OperationCatalogsPage />);
    await screen.findByText("BANCOS_p1");
    expect(screen.getByText("Publicados").parentElement).toHaveTextContent(
      "31",
    );
    expect(screen.getByText("Sin versión").parentElement).toHaveTextContent(
      "2",
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: /código, nombre, dominio o dueño/i }),
      { target: { value: "b" } },
    );
    await waitFor(() =>
      expect(llamadas.at(-1)?.query).toMatchObject({ q: "b", page: 1 }),
    );
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("BANCOS_p2")).toBeInTheDocument();
  });
});

describe("Políticas de gobierno (L8)", () => {
  it("es una tabla paginada con buscador y tipo que viajan al servidor, con cifras del summary", async () => {
    renderWithProviders(<DataGovernancePoliciesPage />);
    const enlace = await screen.findByRole("link", { name: "MKT_p1" });
    expect(enlace).toHaveAttribute(
      "href",
      "/internal/governance/policies/purpose%3A12",
    );
    expect(llamadas.at(-1)?.path).toBe(
      "/operations/data-governance/policies/search",
    );
    expect(
      screen.getByText("Campos sensibles").parentElement,
    ).toHaveTextContent("11");
    await elegirOpcion(
      screen.getByRole("combobox", { name: /Tipo/ }),
      "retention",
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: /código, nombre o alcance/i }),
      { target: { value: "cli" } },
    );
    await waitFor(() =>
      expect(llamadas.at(-1)?.query).toMatchObject({
        type: "retention",
        q: "cli",
        page: 1,
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(
      await screen.findByRole("link", { name: "MKT_p2" }),
    ).toBeInTheDocument();
  });
});
