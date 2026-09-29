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

const { DecisionArtifactsPage } =
  await import("@/features/decision-artifacts/decision-artifacts-page");
const { DecisionDetailPage } =
  await import("@/features/decision-artifacts/decision-detail-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

/** Lo que devolvía TEST el 2026-09-28: el Motor sólo publica el artefacto de identidad. */
const RESPUESTA = {
  bindings: [
    {
      decisionType: "identity",
      artifactCode: "IDENTIDAD_CARNET_MOVIL",
      source: "environment",
      pinnedVersion: null,
      title: "Verificación de identidad",
    },
    {
      decisionType: "credit",
      artifactCode: "ATLAS_BNPL_UNDERWRITING",
      source: "environment",
      pinnedVersion: null,
      title: "Evaluación de crédito",
    },
    {
      decisionType: "partner",
      artifactCode: null,
      source: "unset",
      pinnedVersion: null,
      title: "Alta de comercio",
    },
  ],
  availableArtifacts: [
    {
      code: "IDENTIDAD_CARNET_MOVIL",
      name: "Identidad con carnet",
      type: "IDENTITY_POLICY",
      latestVersion: "1.2.0",
      status: "COMPILED",
    },
  ],
};

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(`${API_BASE}/internal/decision-artifacts`, () =>
      HttpResponse.json({ data: RESPUESTA }),
    ),
  );
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

describe("DecisionArtifactsPage · el artefacto existe o no en el motor", () => {
  it("marca el que el motor no publica en vez de darlo por configurado", async () => {
    renderWithProviders(<DecisionArtifactsPage />);
    const credito = await screen.findByTestId("decision-row-credit");
    const fila = credito.closest("tr")!;
    expect(fila).toHaveTextContent("No existe en el motor");
    const identidad = screen
      .getByTestId("decision-row-identity")
      .closest("tr")!;
    expect(identidad).toHaveTextContent("Existe en el motor");
    const comercio = screen.getByTestId("decision-row-partner").closest("tr")!;
    expect(comercio).not.toHaveTextContent("motor");
  });

  it("un 403 dice que el rol no alcanza, no que el servicio no respondió", async () => {
    server.use(
      http.get(`${API_BASE}/internal/decision-artifacts`, () =>
        HttpResponse.json(
          {
            error: { code: "FORBIDDEN", message: "sin rol" },
            timestamp: "2026-09-28T00:00:00.000Z",
          },
          { status: 403 },
        ),
      ),
    );
    renderWithProviders(<DecisionArtifactsPage />);
    expect(
      await screen.findByText(/Tu rol no tiene acceso a esta configuración/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no respondió/)).toBeNull();
  });
});

describe("DecisionDetailPage · decisión que el motor no puede resolver", () => {
  it("avisa de que el artefacto no está publicado", async () => {
    renderWithProviders(<DecisionDetailPage decisionType="credit" />);
    expect(
      await screen.findByTestId("artifact-missing-in-engine"),
    ).toHaveTextContent("ATLAS_BNPL_UNDERWRITING");
  });

  it("no avisa cuando el artefacto sí existe", async () => {
    renderWithProviders(<DecisionDetailPage decisionType="identity" />);
    await screen.findByTestId("decision-config");
    expect(screen.queryByTestId("artifact-missing-in-engine")).toBeNull();
  });
});
