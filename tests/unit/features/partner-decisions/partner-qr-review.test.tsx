import { HttpResponse, http } from "msw";
import { fireEvent, screen, waitFor } from "@testing-library/react";
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

const { PartnerQrReviewQueue } =
  await import("@/features/partner-decisions/partner-qr-review");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");
const { AuthProvider } = await import("@/shared/auth/auth-context");
const { setStoredInternalSession } =
  await import("@/shared/auth/session-storage");
const { makeSession, makeUser } =
  await import("../../../helpers/session-fixtures");

/**
 * La cola de QR de cobro.
 *
 * Lo que se fija: la cola llama a la ruta real de pendientes; aprobar manda `approved: true` a la
 * ruta de revisión del QR concreto; rechazar no se ofrece sin nota; y sin `partner.qr.review` no
 * se promete nada que el backend vaya a responder con 403.
 */
const PENDIENTE = {
  qrId: "4",
  partnerId: "7",
  qrKind: "bank",
  branchId: null,
  fingerprint: "5b8279b1dccf",
  contentType: "image/png",
  sizeBytes: 1736,
  bankInstitutionCode: "BNB",
  accountNumberMasked: "****7412",
  status: "pending_review",
  createdAt: "2026-08-26T17:13:04.000Z",
  partner: {
    legalName: "CPA S.R.L.",
    tradeName: "CPA",
    onboardingStatus: "approved",
  },
};

function render(permissions: string[] = ["partner.qr.review"]) {
  setStoredInternalSession(makeSession({ user: makeUser({ permissions }) }));
  return renderWithProviders(
    <AuthProvider>
      <PartnerQrReviewQueue />
    </AuthProvider>,
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  // jsdom no implementa las URL de objeto; el componente pinta la imagen desde una.
  Object.assign(URL, {
    createObjectURL: () => "blob:qr",
    revokeObjectURL: () => undefined,
  });
  server.use(
    http.get(`${API_BASE}/operations/partners/qr-codes/pending`, () =>
      HttpResponse.json({ data: { items: [PENDIENTE] } }),
    ),
    http.get(
      `${API_BASE}/partner-onboarding/7/qr-codes/4/content`,
      () =>
        new HttpResponse(new Uint8Array([137, 80, 78, 71]), {
          headers: { "content-type": "image/png" },
        }),
    ),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

describe("PartnerQrReviewQueue — el QR lo aprueba una persona", () => {
  it("pinta el QR pendiente con su comercio y su cuenta, y la imagen por blob", async () => {
    render();

    await waitFor(() => expect(screen.getByText("CPA")).toBeInTheDocument());
    expect(screen.getByText("****7412")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("img", { name: /QR bancario/ })).toHaveAttribute(
        "src",
        "blob:qr",
      ),
    );
  });

  it("aprobar manda approved:true a la ruta de revisión del QR concreto", async () => {
    const cuerpos: unknown[] = [];
    server.use(
      http.post(
        `${API_BASE}/operations/partners/7/qr-codes/4/review`,
        async ({ request }) => {
          cuerpos.push(await request.json());
          return HttpResponse.json({
            data: {
              qrId: "4",
              status: "active",
              verifiedAt: "2026-09-14T00:00:00.000Z",
              reviewNote: null,
            },
          });
        },
      ),
    );
    render();
    await waitFor(() => expect(screen.getByText("CPA")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Aprobar QR" }));
    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));

    await waitFor(() => expect(cuerpos).toEqual([{ approved: true }]));
  });

  it("rechazar no se ofrece sin nota: un rechazo mudo deja al comercio subiendo lo mismo otra vez", async () => {
    render();
    await waitFor(() => expect(screen.getByText("CPA")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: "Rechazar QR" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "La imagen no es de un banco" },
    });
    expect(screen.getByRole("button", { name: "Rechazar QR" })).toBeEnabled();
  });

  it("sin `partner.qr.review` no ofrece aprobar ni rechazar, y dice qué permiso falta", async () => {
    render([]);
    await waitFor(() => expect(screen.getByText("CPA")).toBeInTheDocument());

    expect(screen.queryByRole("button", { name: "Aprobar QR" })).toBeNull();
    expect(screen.getByText(/partner\.qr\.review/)).toBeInTheDocument();
  });
});
