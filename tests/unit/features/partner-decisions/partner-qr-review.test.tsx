import { HttpResponse, http } from "msw";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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

const { PartnerQrReviewQueue } =
  await import("@/features/partner-decisions/partner-qr-review");
const { PartnerQrDialog } =
  await import("@/features/partner-decisions/partner-qr-dialog");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");
const { AuthProvider } = await import("@/shared/auth/auth-context");
const { setStoredInternalSession } =
  await import("@/shared/auth/session-storage");
const { makeSession, makeUser } =
  await import("../../../helpers/session-fixtures");
const { elegirOpcion } = await import("../../shared/option-select-helpers");

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
    taxId: "1023456029",
    onboardingStatus: "approved",
  },
  branch: { branchCode: "SUC-01", name: "Sucursal Miraflores", city: "La Paz" },
};

const RESUMEN = { total: 23, business: 20, bank: 3, oldestCreatedAt: null };

/** Abre el diálogo de revisión del QR de la primera fila: la imagen y las decisiones viven ahí. */
async function abrirRevision() {
  await waitFor(() => expect(screen.getByText("CPA")).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: /^Revisar el / }));
  return screen.findByRole("dialog");
}

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
      HttpResponse.json({
        data: {
          items: [PENDIENTE],
          meta: { page: 1, limit: 10, total: 23, totalPages: 3 },
          summary: RESUMEN,
        },
      }),
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

describe("PartnerQrReviewQueue — tabla homogénea", () => {
  it("es una tabla con cabeceras y una fila por QR, con comercio, NIT, sucursal y cuenta; sin tarjetas", async () => {
    render();

    await waitFor(() => expect(screen.getByText("CPA")).toBeInTheDocument());
    const tabla = screen.getByRole("table");
    for (const cabecera of [
      "Comercio",
      "Tipo",
      "Sucursal",
      "Entidad",
      "Cuenta",
      "Huella del archivo",
      "Subido",
    ])
      expect(
        within(tabla).getByRole("columnheader", { name: new RegExp(cabecera) }),
      ).toBeInTheDocument();
    expect(within(tabla).getByText(/NIT 1023456029/)).toBeInTheDocument();
    expect(within(tabla).getByText("Sucursal Miraflores")).toBeInTheDocument();
    expect(within(tabla).getByText("****7412")).toBeInTheDocument();
    expect(screen.queryByTestId("qr-pendiente-4")).toBeNull();
    // Ninguna imagen se descarga hasta que alguien pulsa «Revisar».
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("las cifras salen del summary de la cola entera", async () => {
    render();

    await waitFor(() => expect(screen.getByText("CPA")).toBeInTheDocument());
    expect(
      screen.getByText("QR pendientes de activar").parentElement,
    ).toHaveTextContent("23");
    expect(screen.getByText("Del negocio").parentElement).toHaveTextContent(
      "20",
    );
    expect(
      screen.getByText("De cuenta bancaria").parentElement,
    ).toHaveTextContent("3");
  });

  it("el buscador y el tipo de QR viajan al servidor, con la página en 1", async () => {
    const pedidas: URLSearchParams[] = [];
    server.use(
      http.get(
        `${API_BASE}/operations/partners/qr-codes/pending`,
        ({ request }) => {
          pedidas.push(new URL(request.url).searchParams);
          return HttpResponse.json({
            data: {
              items: [PENDIENTE],
              meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
              summary: RESUMEN,
            },
          });
        },
      ),
    );
    render();
    await waitFor(() => expect(screen.getByText("CPA")).toBeInTheDocument());

    fireEvent.change(screen.getByRole("textbox", { name: /Comercio, NIT/ }), {
      target: { value: "miraflores" },
    });
    await waitFor(() => expect(pedidas.at(-1)?.get("q")).toBe("miraflores"));
    await elegirOpcion(
      screen.getByRole("combobox", { name: /Tipo de QR/ }),
      "bank",
    );
    await waitFor(() => {
      expect(pedidas.at(-1)?.get("qrKind")).toBe("bank");
      expect(pedidas.at(-1)?.get("q")).toBe("miraflores");
      expect(pedidas.at(-1)?.get("page")).toBe("1");
    });
    // El buscador se conserva en pantalla mientras llega la respuesta.
    expect(
      screen.getByRole("textbox", { name: /Comercio, NIT/ }),
    ).toBeInTheDocument();
  });

  it("pide una página con límite y pasa a la siguiente con el total del servidor", async () => {
    const pedidas: URLSearchParams[] = [];
    server.use(
      http.get(
        `${API_BASE}/operations/partners/qr-codes/pending`,
        ({ request }) => {
          pedidas.push(new URL(request.url).searchParams);
          return HttpResponse.json({
            data: {
              items: [PENDIENTE],
              meta: { page: 1, limit: 10, total: 23, totalPages: 3 },
              summary: RESUMEN,
            },
          });
        },
      ),
    );
    render();
    await waitFor(() => expect(screen.getByText("CPA")).toBeInTheDocument());
    expect(pedidas.at(-1)?.get("limit")).toBe("10");
    expect(screen.getByText(/23 registros/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    await waitFor(() => expect(pedidas.at(-1)?.get("page")).toBe("2"));
  });

  it("«nada coincide» no es «no hay QR esperando»: cada vacío dice lo suyo", async () => {
    server.use(
      http.get(
        `${API_BASE}/operations/partners/qr-codes/pending`,
        ({ request }) => {
          const buscado = new URL(request.url).searchParams.get("q");
          return HttpResponse.json({
            data: {
              items: buscado ? [] : [PENDIENTE],
              meta: {
                page: 1,
                limit: 10,
                total: buscado ? 0 : 1,
                totalPages: buscado ? 0 : 1,
              },
              summary: RESUMEN,
            },
          });
        },
      ),
    );
    render();
    await waitFor(() => expect(screen.getByText("CPA")).toBeInTheDocument());
    fireEvent.change(screen.getByRole("textbox", { name: /Comercio, NIT/ }), {
      target: { value: "zzz" },
    });
    expect(
      await screen.findByText(
        "Ningún QR pendiente de activar coincide con la búsqueda.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("No hay QR pendientes de activar.")).toBeNull();
  });

  it("sin nada en la cola dice que no hay QR esperando", async () => {
    server.use(
      http.get(`${API_BASE}/operations/partners/qr-codes/pending`, () =>
        HttpResponse.json({
          data: {
            items: [],
            meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
            summary: { total: 0, business: 0, bank: 0, oldestCreatedAt: null },
          },
        }),
      ),
    );
    render();
    expect(
      await screen.findByText("No hay QR pendientes de activar."),
    ).toBeInTheDocument();
  });

  it("si la cola falla dice por qué y «Reintentar» la vuelve a pedir", async () => {
    let intento = 0;
    server.use(
      http.get(`${API_BASE}/operations/partners/qr-codes/pending`, () => {
        intento += 1;
        return intento === 1
          ? HttpResponse.json(
              { error: { code: "X", message: "La cola de QR no respondió." } },
              { status: 500 },
            )
          : HttpResponse.json({
              data: {
                items: [PENDIENTE],
                meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
                summary: RESUMEN,
              },
            });
      }),
    );
    render();
    await screen.findByRole("button", { name: /reintentar/i });
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    await waitFor(() => expect(screen.getByText("CPA")).toBeInTheDocument());
  });
});

describe("PartnerQrReviewQueue — el QR lo aprueba una persona (diálogo «Revisar»)", () => {
  it("«Revisar» abre la imagen por blob junto a las decisiones", async () => {
    render();

    const dialogo = await abrirRevision();
    await waitFor(() =>
      expect(
        within(dialogo).getByRole("img", { name: /QR bancario/ }),
      ).toHaveAttribute("src", expect.stringContaining("blob:qr")),
    );
    expect(
      within(dialogo).getByRole("button", { name: "Activar QR" }),
    ).toBeInTheDocument();
  });

  it("aprobar manda approved:true a la ruta de revisión del QR concreto y cierra el diálogo", async () => {
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
    const dialogo = await abrirRevision();

    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Activar QR" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Activar" }));

    await waitFor(() => expect(cuerpos).toEqual([{ approved: true }]));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("rechazar no se ofrece sin nota: un rechazo mudo deja al comercio subiendo lo mismo otra vez", async () => {
    render();
    const dialogo = await abrirRevision();

    expect(
      within(dialogo).getByRole("button", { name: "Rechazar QR" }),
    ).toBeDisabled();
    fireEvent.change(within(dialogo).getByRole("textbox"), {
      target: { value: "La imagen no es de un banco" },
    });
    expect(
      within(dialogo).getByRole("button", { name: "Rechazar QR" }),
    ).toBeEnabled();
  });

  it("sin `partner.qr.review` no ofrece aprobar ni rechazar, y dice quién puede, sin el código del permiso", async () => {
    render([]);
    const dialogo = await abrirRevision();

    expect(
      within(dialogo).queryByRole("button", { name: "Activar QR" }),
    ).toBeNull();
    expect(
      within(dialogo).getByText(
        /lo hace el equipo de Operaciones de comercios/,
      ),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("partner.qr.review");
  });
});

/*
 * Desde el 2026-10-02 el QR nace activo al confirmarlo el comercio (Pablo: «el QR lo confirma el
 * negocio, no Atlas»). Lo que queda en manos de Atlas es RETIRAR un QR activo, con nota, desde la
 * ficha del comercio: el diálogo es el mismo, pero sobre un activo no ofrece «Activar».
 */
describe("PartnerQrDialog — revocar un QR activo", () => {
  function renderActivo(permissions: string[] = ["partner.qr.review"]) {
    setStoredInternalSession(makeSession({ user: makeUser({ permissions }) }));
    const onClose = vi.fn();
    renderWithProviders(
      <AuthProvider>
        <PartnerQrDialog qr={{ ...PENDIENTE, status: "active" }} onClose={onClose} />
      </AuthProvider>,
    );
    return onClose;
  }

  it("sobre un QR activo sólo ofrece revocar, y exige la nota", async () => {
    renderActivo();
    const dialogo = await screen.findByRole("dialog");
    expect(
      within(dialogo).queryByRole("button", { name: "Activar QR" }),
    ).toBeNull();
    expect(
      within(dialogo).getByRole("button", { name: "Revocar QR" }),
    ).toBeDisabled();
    expect(
      within(dialogo).getByText(/ven HOY los clientes del comercio/),
    ).toBeInTheDocument();
  });

  it("revocar manda approved:false con la nota a la ruta de revisión y cierra", async () => {
    const cuerpos: unknown[] = [];
    server.use(
      http.post(
        `${API_BASE}/operations/partners/7/qr-codes/4/review`,
        async ({ request }) => {
          cuerpos.push(await request.json());
          return HttpResponse.json({
            data: {
              qrId: "4",
              status: "rejected",
              verifiedAt: "2026-10-02T00:00:00.000Z",
              reviewNote: "La cuenta no es del comercio",
            },
          });
        },
      ),
    );
    const onClose = renderActivo();
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByRole("textbox"), {
      target: { value: "La cuenta no es del comercio" },
    });
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Revocar QR" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Revocar" }));

    await waitFor(() =>
      expect(cuerpos).toEqual([
        { approved: false, note: "La cuenta no es del comercio" },
      ]),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
