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

const { PartnerFileDrawer } =
  await import("@/features/partner-decisions/partner-file-drawer");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");
const { AuthProvider } = await import("@/shared/auth/auth-context");
const { setStoredInternalSession } =
  await import("@/shared/auth/session-storage");
const { makeSession, makeUser } =
  await import("../../../helpers/session-fixtures");

/** El cajón lee los permisos de la sesión: por defecto, los de quien puede pedir la verificación. */
function renderCajon(permissions: string[] = ["partner.kyb.request"]) {
  setStoredInternalSession(makeSession({ user: makeUser({ permissions }) }));
  return renderWithProviders(
    <AuthProvider>
      <PartnerFileDrawer expediente={EXPEDIENTE} onClose={() => {}} />
    </AuthProvider>,
  );
}

const EXPEDIENTE = {
  partnerId: "10",
  legalName: "Comercial Andina S.R.L.",
  tradeName: "Andina",
  taxId: "123456",
  onboardingStatus: "under_review",
  submittedAt: "2026-09-01T00:00:00.000Z",
};

function estadoCon(decision: Record<string, unknown> | null) {
  return {
    data: {
      profile: {
        ...EXPEDIENTE,
        mdrRatePercent: "3.50",
        decision,
      },
      gaps: [],
      readyToSubmit: true,
      branches: [],
      qrCodes: [],
      posTerminals: [],
    },
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

describe("PartnerFileDrawer — quién decidió manda sobre qué se ofrece", () => {
  it("con caso abierto en el Motor NO ofrece aprobar ni rechazar", async () => {
    server.use(
      http.get(`${API_BASE}/partner-onboarding/10/status`, () =>
        HttpResponse.json(
          estadoCon({
            executionId: "exec-1",
            outcome: "REVISION_MANUAL",
            reason: "KYB_SENALES_OPERATIVAS",
            artifactVersionId: "9",
            manualReviewCaseCode: "MRC-3",
            evaluatedAt: "2026-09-08T00:00:00.000Z",
          }),
        ),
      ),
    );

    renderCajon();

    await waitFor(() => expect(screen.getByText("MRC-3")).toBeInTheDocument());
    // Dos bandejas para el mismo expediente producen dos veredictos: aquí no se decide.
    expect(screen.queryByRole("button", { name: "Aprobar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Rechazar" })).toBeNull();
    expect(
      screen.getByRole("button", { name: /volver a pedir la verificación/i }),
    ).toBeInTheDocument();
  });

  it("sin `partner.kyb.request` no ofrece volver a pedir la verificación, y dice quién puede", async () => {
    server.use(
      http.get(`${API_BASE}/partner-onboarding/10/status`, () =>
        HttpResponse.json(
          estadoCon({
            executionId: "exec-1",
            outcome: "REVISION_MANUAL",
            reason: "KYB_SENALES_OPERATIVAS",
            artifactVersionId: "9",
            manualReviewCaseCode: "MRC-3",
            evaluatedAt: "2026-09-08T00:00:00.000Z",
          }),
        ),
      ),
    );

    renderCajon([]);

    await waitFor(() => expect(screen.getByText("MRC-3")).toBeInTheDocument());
    // El backend respondería 403: no se promete lo que no va a pasar.
    expect(
      screen.queryByRole("button", { name: /volver a pedir la verificación/i }),
    ).toBeNull();
    expect(
      screen.getByText(/no puede pedir la verificación al Motor/),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("partner.kyb.request");
  });

  it("sin caso del Motor la decisión manual sigue disponible: es la degradación", async () => {
    server.use(
      http.get(`${API_BASE}/partner-onboarding/10/status`, () =>
        HttpResponse.json(
          estadoCon({
            executionId: "exec-2",
            outcome: "REVISION_MANUAL",
            reason: "KYB_SENALES_OPERATIVAS",
            artifactVersionId: "9",
            manualReviewCaseCode: null,
            evaluatedAt: "2026-09-08T00:00:00.000Z",
          }),
        ),
      ),
    );

    renderCajon();

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Aprobar" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Decidió el Motor")).toBeInTheDocument();
  });

  it("sin veredicto lo dice, en vez de dejar el hueco en blanco", async () => {
    server.use(
      http.get(`${API_BASE}/partner-onboarding/10/status`, () =>
        HttpResponse.json(estadoCon(null)),
      ),
    );

    renderCajon();

    await waitFor(() =>
      expect(screen.getByText(/Sin veredicto del Motor/)).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Aprobar" })).toBeInTheDocument();
  });
});

const SIN_CASO = {
  executionId: "exec-2",
  outcome: "REVISION_MANUAL",
  reason: "KYB_SENALES_OPERATIVAS",
  artifactVersionId: "9",
  manualReviewCaseCode: null,
  evaluatedAt: "2026-09-08T00:00:00.000Z",
};

describe("PartnerFileDrawer — lo que falla se dice, y en palabras", () => {
  it("enseña el estado en español, no el código", async () => {
    server.use(
      http.get(`${API_BASE}/partner-onboarding/10/status`, () =>
        HttpResponse.json(estadoCon(SIN_CASO)),
      ),
    );
    renderCajon();
    await waitFor(() =>
      expect(screen.getAllByText("En revisión").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("Revisión manual").length).toBeGreaterThan(0);
    expect(screen.queryByText("under_review")).toBeNull();
    expect(screen.queryByText("REVISION_MANUAL")).toBeNull();
  });

  it("un 409 al decidir deja el diálogo abierto y dice por qué", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_BASE}/partner-onboarding/10/status`, () =>
        HttpResponse.json(estadoCon(SIN_CASO)),
      ),
      http.post(`${API_BASE}/operations/partners/10/decision`, () =>
        HttpResponse.json(
          {
            error: {
              code: "CONFLICT",
              message:
                "PARTNER_NOT_UNDER_REVIEW: el expediente está en approved.",
            },
          },
          { status: 409 },
        ),
      ),
    );
    renderCajon();
    await user.click(await screen.findByRole("button", { name: "Aprobar" }));
    const dialogo = await screen.findByRole("dialog", {
      name: "Aprobar el expediente",
    });
    await user.click(within(dialogo).getByRole("button", { name: "Aprobar" }));

    await waitFor(() =>
      expect(
        within(dialogo).getByText(/ya no está en revisión/),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("dialog", { name: "Aprobar el expediente" }),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("PARTNER_NOT_UNDER_REVIEW");
  });

  it("el texto de aprobar no promete que los QR se aprueben", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_BASE}/partner-onboarding/10/status`, () =>
        HttpResponse.json(estadoCon(SIN_CASO)),
      ),
    );
    renderCajon();
    await user.click(await screen.findByRole("button", { name: "Aprobar" }));
    const dialogo = await screen.findByRole("dialog", {
      name: "Aprobar el expediente",
    });
    expect(
      within(dialogo).getByText(/Sus QR de cobro no cambian/),
    ).toBeInTheDocument();
  });

  it("sin `partner.kyb.request` tampoco ofrece «Pedir la verificación al Motor»", async () => {
    server.use(
      http.get(`${API_BASE}/partner-onboarding/10/status`, () =>
        HttpResponse.json(estadoCon(SIN_CASO)),
      ),
    );
    renderCajon([]);
    await screen.findByRole("button", { name: "Aprobar" });
    expect(
      screen.queryByRole("button", { name: /pedir la verificación al motor/i }),
    ).toBeNull();
  });

  it("con el Motor caído, pedir la verificación lo dice", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_BASE}/partner-onboarding/10/status`, () =>
        HttpResponse.json(estadoCon(SIN_CASO)),
      ),
      http.post(`${API_BASE}/operations/partners/10/kyb-review`, () =>
        HttpResponse.json(
          {
            error: {
              code: "SERVICE_UNAVAILABLE",
              message: "DECISION_ENGINE_UNAVAILABLE",
            },
          },
          { status: 503 },
        ),
      ),
    );
    renderCajon();
    await user.click(
      await screen.findByRole("button", {
        name: /pedir la verificación al motor/i,
      }),
    );
    expect(
      await screen.findByText(/El Motor no respondió/),
    ).toBeInTheDocument();
  });

  it("enlaza a los documentos en Archivos y enseña sucursales y QR legibles", async () => {
    server.use(
      http.get(`${API_BASE}/partner-onboarding/10/status`, () =>
        HttpResponse.json({
          data: {
            ...estadoCon(SIN_CASO).data,
            branches: [
              {
                branchId: "3",
                name: "Casa matriz",
                city: "La Paz",
                status: "active",
              },
            ],
            qrCodes: [
              {
                qrId: "8",
                qrKind: "bank",
                branchId: "3",
                status: "pending_review",
                accountNumberMasked: "****1234",
              },
            ],
          },
        }),
      ),
      http.get(`${API_BASE}/expedientes/por-sujeto/partner/10`, () =>
        HttpResponse.json({ data: { expedienteId: "55" } }),
      ),
    );
    renderCajon();
    const enlace = await screen.findByRole("link", {
      name: /ver documentos en archivos/i,
    });
    expect(enlace).toHaveAttribute("href", "/internal/files/55");
    // Sucursales y QR son TABLAS con cabeceras, no listas de tarjetas.
    const tablas = screen.getAllByRole("table");
    expect(tablas).toHaveLength(2);
    const [sucursales, qr] = tablas;
    expect(
      within(sucursales)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(
      expect.arrayContaining(["Sucursal", "Dirección", "Ciudad", "Estado"]),
    );
    expect(within(sucursales).getByText("Casa matriz")).toBeInTheDocument();
    expect(within(qr).getByText("Casa matriz")).toBeInTheDocument();
    expect(within(qr).getByText("****1234")).toBeInTheDocument();
    expect(within(qr).getByText("Pendiente de revisión")).toBeInTheDocument();
    expect(screen.queryByText("Expediente completo")).toBeNull();
  });
});
