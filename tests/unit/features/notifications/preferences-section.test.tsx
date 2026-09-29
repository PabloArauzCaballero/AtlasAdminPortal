import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { PreferencesSection } from "@/features/notifications/preferences-section";
import { renderWithProviders } from "../../../helpers/render-with-providers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));
const sesion = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    permissions: sesion.permissions,
    hasPermission: (p: string) => sesion.permissions.includes(p),
  }),
}));

const request = vi.mocked(apiRequest);
const pref = (id: string, eventCode: string, channel: string, on: boolean) => ({
  id,
  customerId: "1024",
  eventCode,
  channel,
  isEnabled: on,
  isRequired: eventCode === "cuota_vencida",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
});

const filas = () => within(screen.getByRole("table")).getAllByRole("row");

async function cargar() {
  fireEvent.change(screen.getByLabelText(/ID de cliente/), {
    target: { value: "1024" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cargar preferencias" }));
  await screen.findByRole("table");
}

describe("Preferencias de notificación de un cliente", () => {
  beforeEach(() => {
    sesion.permissions = [];
    request.mockReset();
    request.mockResolvedValue({
      data: [
        pref("1", "cuota_vencida", "push", true),
        pref("2", "promo", "email", false),
        pref("3", "promo", "sms", true),
      ],
    });
  });

  it("son una tabla con cabeceras y el buscador y los filtros recortan las filas", async () => {
    renderWithProviders(<PreferencesSection />);
    await cargar();
    for (const cabecera of ["Evento", "Canal", "Obligatorio", "Estado"]) {
      expect(
        within(screen.getByRole("table")).getByRole("columnheader", {
          name: cabecera,
        }),
      ).toBeInTheDocument();
    }
    expect(filas()).toHaveLength(4);
    fireEvent.change(
      screen.getByRole("textbox", { name: /código de evento/ }),
      {
        target: { value: "promo" },
      },
    );
    await waitFor(() => expect(filas()).toHaveLength(3));
    fireEvent.change(
      screen.getByRole("textbox", { name: /código de evento/ }),
      {
        target: { value: "zzz" },
      },
    );
    expect(
      await screen.findByText("Ninguna preferencia coincide con la búsqueda."),
    ).toBeInTheDocument();
  });

  it("un cliente sin preferencias lo dice", async () => {
    request.mockResolvedValue({ data: [] });
    renderWithProviders(<PreferencesSection />);
    fireEvent.change(screen.getByLabelText(/ID de cliente/), {
      target: { value: "7" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Cargar preferencias" }),
    );
    expect(
      await screen.findByText(/no tiene preferencias registradas todavía/),
    ).toBeInTheDocument();
  });

  it("sólo quien gestiona puede apagar un aviso, y el obligatorio no se apaga", async () => {
    sesion.permissions = ["notifications.messages.manage"];
    renderWithProviders(<PreferencesSection />);
    await cargar();
    const tabla = screen.getByRole("table");
    const botones = within(tabla).getAllByRole("button", {
      name: /Activo|Inactivo/,
    });
    expect(botones).toHaveLength(3);
    expect(botones[0]).toBeDisabled();
    expect(botones[1]).toBeEnabled();
  });
});
