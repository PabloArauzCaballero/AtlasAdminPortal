import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { MessagesSection } from "@/features/notifications/messages-section";
import { TemplatesSection } from "@/features/notifications/templates-section";
import { MyNotificationsPage } from "@/features/my-notifications/my-notifications-page";
import { finDelDia, inicioDelDia } from "@/features/notifications/date-range";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import { elegirOpcion } from "../../shared/option-select-helpers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));
const sesion = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    permissions: sesion.permissions,
    roles: [],
    hasPermission: () => true,
    hasAnyRole: () => true,
  }),
}));

const request = vi.mocked(apiRequest);
const consultas: Record<string, Array<Record<string, unknown>>> = {};
let falla = false;

const mensaje = (pagina: number) => ({
  id: String(pagina),
  tenantId: null,
  outboxEventId: null,
  recipientType: "customer",
  recipientId: "1024",
  channel: "email",
  templateCode: `PLANTILLA_${pagina}`,
  subject: `Asunto ${pagina}`,
  title: `Título ${pagina}`,
  body: "Cuerpo",
  payload: {},
  status: "failed",
  priority: 5,
  category: null,
  icon: null,
  scheduledAt: null,
  queuedAt: null,
  sentAt: null,
  deliveredAt: null,
  readAt: null,
  failedAt: null,
  cancelledAt: null,
  correlationId: `corr-${pagina}`,
  causationId: null,
  createdAt: "2026-09-20T10:00:00Z",
});

const plantilla = (pagina: number) => ({
  id: String(pagina),
  code: `PLANTILLA_${pagina}`,
  channel: "email",
  locale: "es",
  version: 1,
  category: null,
  titleTemplate: `Hola ${pagina}`,
  subjectTemplate: null,
  bodyTemplate: "Cuerpo",
  isActive: true,
});

beforeEach(() => {
  for (const clave of Object.keys(consultas)) delete consultas[clave];
  falla = false;
  sesion.permissions = [];
  request.mockReset();
  request.mockImplementation(async (path, options) => {
    const query = (options?.query ?? {}) as Record<string, unknown>;
    (consultas[path] ??= []).push(query);
    if (path.endsWith("unread-count")) return { unread: 4 };
    if (falla) throw new Error("sin red");
    const pagina = Number(query.page ?? 1);
    const meta = { page: pagina, limit: 20, total: 45, totalPages: 3 };
    if (path.endsWith("/templates")) {
      return { data: [plantilla(pagina)], pagination: meta };
    }
    return { data: [mensaje(pagina)], pagination: meta };
  });
});

const ultima = (ruta: string) => consultas[ruta]?.at(-1);

describe("Mensajes de notificación", () => {
  const RUTA = "/operations/notifications/messages";

  it("el buscador viaja como q (ya no es el correlationId exacto)", async () => {
    renderWithProviders(<MessagesSection onOpen={vi.fn()} />);
    await screen.findByText("Título 1");
    fireEvent.change(
      screen.getByRole("textbox", {
        name: /correlation ID, plantilla o título/i,
      }),
      { target: { value: "corr-" } },
    );
    await waitFor(() =>
      expect(ultima(RUTA)).toMatchObject({ q: "corr-", page: 1 }),
    );
    expect(ultima(RUTA)?.correlationId).toBeUndefined();
  });

  it("ofrece destinatario y fechas, y las fechas viajan como el día entero en hora local", async () => {
    renderWithProviders(<MessagesSection onOpen={vi.fn()} />);
    await screen.findByText("Título 1");
    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Destinatario/ }),
      "customer",
    );
    fireEvent.change(screen.getByLabelText(/ID del destinatario/), {
      target: { value: "1024" },
    });
    fireEvent.change(screen.getByLabelText(/^Desde/), {
      target: { value: "2026-09-03" },
    });
    fireEvent.change(screen.getByLabelText(/^Hasta/), {
      target: { value: "2026-09-05" },
    });
    await waitFor(() =>
      expect(ultima(RUTA)).toMatchObject({
        recipientType: "customer",
        recipientId: "1024",
        from: inicioDelDia("2026-09-03"),
        to: finDelDia("2026-09-05"),
      }),
    );
  });

  it("«hasta el 5» incluye el día 5 entero", () => {
    const desde = new Date(inicioDelDia("2026-09-05") ?? "");
    const hasta = new Date(finDelDia("2026-09-05") ?? "");
    expect(hasta.getTime() - desde.getTime()).toBe(24 * 3600 * 1000 - 1);
    expect(inicioDelDia("")).toBeUndefined();
    expect(finDelDia("no-es-fecha")).toBeUndefined();
  });

  it("pagina con el total del servidor y, si falla, ofrece reintentar", async () => {
    renderWithProviders(<MessagesSection onOpen={vi.fn()} />);
    await screen.findByText("Título 1");
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("Título 2")).toBeInTheDocument();
    expect(ultima(RUTA)).toMatchObject({ page: 2 });

    falla = true;
    renderWithProviders(<MessagesSection onOpen={vi.fn()} />);
    const reintentar = await screen.findByRole("button", {
      name: /reintentar/i,
    });
    falla = false;
    await userEvent.click(reintentar);
    expect((await screen.findAllByText("Título 1")).length).toBeGreaterThan(0);
  });
});

describe("Plantillas de notificación", () => {
  const RUTA = "/operations/notifications/templates";

  it("pide de a 20 con el total real, no limit 100, y el buscador viaja como q", async () => {
    renderWithProviders(<TemplatesSection />);
    await screen.findByText("PLANTILLA_1");
    expect(ultima(RUTA)).toMatchObject({ page: 1 });
    expect(ultima(RUTA)?.limit).not.toBe(100);
    fireEvent.change(
      screen.getByRole("textbox", { name: /código, título o asunto/i }),
      { target: { value: "otp" } },
    );
    await waitFor(() => expect(ultima(RUTA)).toMatchObject({ q: "otp" }));
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    await waitFor(() =>
      expect(ultima(RUTA)).toMatchObject({ page: 2, q: "otp" }),
    );
  });

  it("las plantillas son una tabla con cabeceras, no un muro de tarjetas", async () => {
    sesion.permissions = ["notifications.templates.manage"];
    renderWithProviders(<TemplatesSection />);
    const tabla = await screen.findByRole("table");
    for (const cabecera of [
      "Código",
      "Canal",
      "Versión",
      "Estado",
      "Acciones",
    ]) {
      expect(
        within(tabla).getByRole("columnheader", { name: cabecera }),
      ).toBeInTheDocument();
    }
    const fila = within(tabla).getByText("PLANTILLA_1").closest("tr");
    expect(fila).not.toBeNull();
    expect(
      within(fila as HTMLElement).getByRole("button", { name: "Editar" }),
    ).toBeInTheDocument();
  });

  it("sin coincidencias dice que nada coincide, no que no hay plantillas", async () => {
    request.mockImplementation(async (path, options) => {
      const query = (options?.query ?? {}) as Record<string, unknown>;
      (consultas[path] ??= []).push(query);
      return {
        data: [],
        pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
      };
    });
    renderWithProviders(<TemplatesSection />);
    expect(
      await screen.findByText("Todavía no hay plantillas."),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", { name: /código, título o asunto/i }),
      { target: { value: "zzz" } },
    );
    expect(
      await screen.findByText("Ninguna plantilla coincide con la búsqueda."),
    ).toBeInTheDocument();
  });

  it("el canal viaja al servidor", async () => {
    renderWithProviders(<TemplatesSection />);
    await screen.findByText("PLANTILLA_1");
    await elegirOpcion(screen.getByRole("combobox", { name: /^Canal/ }), "sms");
    await waitFor(() => expect(ultima(RUTA)).toMatchObject({ channel: "sms" }));
  });
});

describe("Mis notificaciones", () => {
  const RUTA = "/internal-users/me/notifications";

  it("usa FilterBar: buscador q, estado y canal viajan al servidor", async () => {
    renderWithProviders(<MyNotificationsPage />);
    await screen.findByText("Título 1");
    expect(screen.getByText(/4 sin leer/)).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", { name: /título o el texto/i }),
      { target: { value: "cobro" } },
    );
    await waitFor(() => expect(ultima(RUTA)).toMatchObject({ q: "cobro" }));
    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Estado/ }),
      "failed",
    );
    await waitFor(() =>
      expect(ultima(RUTA)).toMatchObject({ q: "cobro", status: "failed" }),
    );
  });
});
