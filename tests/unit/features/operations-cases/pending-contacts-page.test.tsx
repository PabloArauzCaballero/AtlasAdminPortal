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

/**
 * Contactos sin verificar (auditoría 2026-09-29, O2 y H1): antes sin paginación ni buscador, con un
 * tope oculto de 200 y tarjetas contadas sobre la lista; y «SMS reenviado» tras CUALQUIER 200,
 * aunque el proveedor no hubiera entregado nada.
 */
const { PendingContactsPage } =
  await import("@/features/operations-cases/pending-contacts-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const pedidas: URLSearchParams[] = [];
let reenvio: object = {};

const contacto = {
  customerId: "21",
  customerCode: "CUS-21",
  lifecycleStatus: "under_review",
  customerCreatedAt: "2026-09-14T10:00:00.000Z",
  contactMethodId: "501",
  contactType: "phone",
  valueLast4: "7788",
  emailDomain: null,
  isPrimary: true,
  contactCreatedAt: "2026-09-14T10:00:00.000Z",
};

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
beforeEach(() => {
  pedidas.length = 0;
  reenvio = { deliveryStatus: "sent", deliveredChannel: "sms" };
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(
      `${API_BASE}/operations/customers/pending-contact-verification`,
      ({ request }) => {
        pedidas.push(new URL(request.url).searchParams);
        return HttpResponse.json({
          data: {
            items: [contacto],
            meta: { page: 1, limit: 25, total: 260, totalPages: 11 },
            summary: { total: 260, email: 200, phone: 60 },
          },
        });
      },
    ),
    http.post(
      `${API_BASE}/customer-onboarding/21/contact-verification/request`,
      () => HttpResponse.json({ data: reenvio }),
    ),
  );
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

const ultima = () => pedidas.at(-1)!;

describe("PendingContactsPage · lista por páginas", () => {
  it("las tarjetas salen del summary del servidor (260, no las filas cargadas) y se pagina", async () => {
    renderWithProviders(<PendingContactsPage />);
    await waitFor(() =>
      expect(
        screen.getByText("Contactos pendientes (toda la cola)").parentElement,
      ).toHaveTextContent("260"),
    );
    expect(screen.getByText("Correos").parentElement).toHaveTextContent("200");
    expect(ultima().get("page")).toBe("1");
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    await waitFor(() => expect(ultima().get("page")).toBe("2"));
  });

  it("el buscador y el tipo viajan al servidor", async () => {
    renderWithProviders(<PendingContactsPage />);
    await userEvent.type(
      await screen.findByRole("textbox", { name: /código de cliente/i }),
      "gmail",
    );
    await waitFor(() => expect(ultima().get("q")).toBe("gmail"));
    await userEvent.click(
      screen.getByRole("combobox", { name: "Tipo de contacto" }),
    );
    await userEvent.click(
      await screen.findByRole("option", { name: /Teléfonos/ }),
    );
    await waitFor(() => expect(ultima().get("contactType")).toBe("phone"));
    expect(ultima().get("page")).toBe("1");
  });
});

describe("PendingContactsPage · el aviso del reenvío dice lo que pasó", () => {
  it("con deliveryStatus=sent dice que el proveedor aceptó el envío", async () => {
    renderWithProviders(<PendingContactsPage />);
    await userEvent.click(
      await screen.findByRole("button", { name: /reenviar/i }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "El proveedor aceptó el envío del código por SMS al cliente CUS-21.",
    );
  });

  it("con deliveryStatus=delivery_failed NO dice «reenviado»: dice que no llegó", async () => {
    reenvio = { deliveryStatus: "delivery_failed", deliveredChannel: "sms" };
    renderWithProviders(<PendingContactsPage />);
    await userEvent.click(
      await screen.findByRole("button", { name: /reenviar/i }),
    );
    const aviso = await screen.findByRole("status");
    expect(aviso).toHaveTextContent("El proveedor no pudo entregar el código");
    expect(aviso).not.toHaveTextContent(/reenviado|aceptó/);
  });
});
