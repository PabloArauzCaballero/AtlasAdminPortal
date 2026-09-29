import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { AtlasApiError } from "@/shared/api/errors";
import { renderWithProviders } from "../../helpers/render-with-providers";
import { elegirOpcion } from "../shared/option-select-helpers";
import {
  buscar,
  cabeceras,
  esTablaHomogenea,
  filasDeDatos,
} from "../shared/tabla-helpers";

const mockUseAuth = vi.fn();
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));

const { NotificationPoliciesPage } =
  await import("@/features/notification-policies/notification-policies-page");

const request = vi.mocked(apiRequest);

function politica(eventCode: string, label: string, over = {}) {
  return {
    policyId: `${eventCode}-push`,
    eventCode,
    channel: "push",
    label,
    description: null,
    category: "pagos",
    icon: null,
    isMandatory: false,
    defaultEnabled: true,
    mandatoryReason: null,
    displayOrder: 1,
    isActive: true,
    updatedAt: null,
    ...over,
  };
}

const SUMMARY = {
  total: 47,
  mandatory: 7,
  active: 41,
  inactive: 6,
  byChannel: { push: 30, email: 15 },
  byCategory: [
    { category: "pagos", count: 30 },
    { category: "seguridad", count: 15 },
  ],
};

function listado(data: unknown[], total = data.length, summary = SUMMARY) {
  return {
    data,
    meta: {
      page: 1,
      limit: 20,
      total,
      totalPages: Math.ceil(total / 20) || 1,
    },
    summary,
  };
}

function asManager() {
  mockUseAuth.mockReturnValue({
    permissions: ["governance.policies.read", "governance.policies.manage"],
  });
}

function asReader() {
  mockUseAuth.mockReturnValue({ permissions: ["governance.policies.read"] });
}

const MORA = politica("cuota_vencida", "Cuota vencida", {
  isMandatory: true,
  mandatoryReason: "Es un aviso de mora.",
  description: "Te avisamos el día del atraso.",
});

describe("Políticas de notificación", () => {
  beforeEach(() => {
    request.mockReset();
    mockUseAuth.mockReset();
  });

  it("la colección es una tabla con cabeceras, buscador y Editar en la fila", async () => {
    asManager();
    request.mockResolvedValue(
      listado([MORA, politica("novedades", "Novedades", { isActive: false })]),
    );
    renderWithProviders(<NotificationPoliciesPage />);

    await screen.findByRole("table");
    esTablaHomogenea(
      [
        "Código",
        "Nombre",
        "Categoría",
        "Canal",
        "Obligatoria",
        "Activa",
        "Acciones",
      ],
      /código, nombre, categoría o explicación/i,
    );
    const filas = filasDeDatos();
    expect(filas).toHaveLength(2);
    const fila = filas[0];
    expect(within(fila).getByText("cuota_vencida")).toBeInTheDocument();
    expect(within(fila).getByText("irrenunciable")).toBeInTheDocument();
    expect(within(fila).getByText(/Es un aviso de mora/)).toBeInTheDocument();
    expect(
      within(fila).getByTestId("edit-cuota_vencida-push"),
    ).toBeInTheDocument();
    expect(within(filas[1]).getByText("inactivo")).toBeInTheDocument();
    expect(cabeceras()).toContain("Canal");
  });

  it("sólo quien gestiona ve el botón de editar", async () => {
    asReader();
    request.mockResolvedValue(listado([MORA]));
    const { unmount } = renderWithProviders(<NotificationPoliciesPage />);
    expect(await screen.findByText("Cuota vencida")).toBeInTheDocument();
    expect(
      screen.queryByTestId("edit-cuota_vencida-push"),
    ).not.toBeInTheDocument();
    unmount();

    asManager();
    renderWithProviders(<NotificationPoliciesPage />);
    expect(
      await screen.findByTestId("edit-cuota_vencida-push"),
    ).toBeInTheDocument();
  });

  it("las cifras salen del resumen del servidor, no de sumar la página", async () => {
    asManager();
    request.mockResolvedValue(listado([MORA], 45));
    renderWithProviders(<NotificationPoliciesPage />);
    await screen.findByRole("table");
    // La página trae 1 fila; las tarjetas cuentan el catálogo entero.
    expect(screen.getByText("47")).toBeInTheDocument();
    expect(screen.getByText("Irrenunciables")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("41")).toBeInTheDocument();
    expect(screen.getByText("Inactivas")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("el buscador, los cuatro filtros y la página viajan al servidor", async () => {
    asManager();
    const consultas: Array<Record<string, unknown>> = [];
    request.mockImplementation((_path, options) => {
      consultas.push((options?.query ?? {}) as Record<string, unknown>);
      return Promise.resolve(listado([MORA], 45));
    });
    renderWithProviders(<NotificationPoliciesPage />);
    await screen.findByRole("table");
    expect(consultas[0]).toMatchObject({ page: 1, limit: 20 });

    await buscar(/código, nombre, categoría o explicación/i, "mora");
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ q: "mora", page: 1 }),
    );
    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Categoría/ }),
      "seguridad",
    );
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ category: "seguridad" }),
    );
    await elegirOpcion(screen.getByRole("combobox", { name: /^Canal/ }), "sms");
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ channel: "sms" }),
    );
    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Obligatoria/ }),
      "true",
    );
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ mandatory: "true" }),
    );
    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Estado/ }),
      "false",
    );
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({
        q: "mora",
        category: "seguridad",
        channel: "sms",
        mandatory: "true",
        active: "false",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ page: 2, active: "false" }),
    );
  });

  it("las categorías del filtro salen del servidor, no de lo que trae la página", async () => {
    asManager();
    request.mockResolvedValue(listado([MORA], 45));
    renderWithProviders(<NotificationPoliciesPage />);
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("combobox", { name: /^Categoría/ }));
    const lista = await screen.findByRole("listbox");
    const valores = within(lista)
      .getAllByRole("option")
      .map((opcion) => opcion.getAttribute("data-value"));
    // La página sólo trae «pagos»; el servidor dice que también hay «seguridad».
    expect(valores).toEqual(expect.arrayContaining(["pagos", "seguridad"]));
  });

  it("sin coincidencias dice que nada coincide, y sin políticas dice que el despliegue está incompleto", async () => {
    asManager();
    request.mockResolvedValue(listado([], 0));
    renderWithProviders(<NotificationPoliciesPage />);
    expect(
      await screen.findByText("No hay políticas configuradas"),
    ).toBeInTheDocument();
    await buscar(/código, nombre, categoría o explicación/i, "zzz");
    expect(
      await screen.findByText("Ninguna política coincide con la búsqueda."),
    ).toBeInTheDocument();
  });

  it("un error del servidor se ve con Reintentar y reintenta", async () => {
    asManager();
    request.mockRejectedValueOnce(
      new AtlasApiError({ status: 500, code: "X", message: "caído" }),
    );
    request.mockResolvedValue(listado([MORA]));
    renderWithProviders(<NotificationPoliciesPage />);
    fireEvent.click(await screen.findByRole("button", { name: /reintentar/i }));
    expect(await screen.findByText("Cuota vencida")).toBeInTheDocument();
  });

  it("Editar abre el formulario encima de la tabla y guardar manda la política con su motivo", async () => {
    asManager();
    request.mockImplementation((_path, options) =>
      Promise.resolve(options?.method === "PUT" ? {} : listado([MORA])),
    );
    renderWithProviders(<NotificationPoliciesPage />);
    fireEvent.click(await screen.findByTestId("edit-cuota_vencida-push"));

    const descripcion = await screen.findByTestId(
      "description-cuota_vencida-push",
    );
    fireEvent.change(descripcion, { target: { value: "Nueva explicación" } });
    fireEvent.click(screen.getByTestId("save-cuota_vencida-push"));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/operations/notification-policies",
        expect.objectContaining({
          method: "PUT",
          body: expect.objectContaining({
            eventCode: "cuota_vencida",
            channel: "push",
            isMandatory: true,
            mandatoryReason: "Es un aviso de mora.",
            description: "Nueva explicación",
          }),
        }),
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByTestId("description-cuota_vencida-push"),
      ).not.toBeInTheDocument(),
    );
  });

  it("un aviso irrenunciable sin motivo no se puede guardar", async () => {
    asManager();
    request.mockResolvedValue(listado([politica("novedades", "Novedades")]));
    renderWithProviders(<NotificationPoliciesPage />);
    fireEvent.click(await screen.findByTestId("edit-novedades-push"));
    fireEvent.click(await screen.findByTestId("mandatory-novedades-push"));
    expect(screen.getByTestId("save-novedades-push")).toBeDisabled();
    fireEvent.change(screen.getByTestId("reason-novedades-push"), {
      target: { value: "Obligación regulatoria" },
    });
    expect(screen.getByTestId("save-novedades-push")).toBeEnabled();
  });

  it("un 403 dice que falta un permiso, no que se reintente", async () => {
    asReader();
    request.mockRejectedValue(
      new AtlasApiError({
        status: 403,
        code: "FORBIDDEN",
        message: "El usuario autenticado no tiene permiso para esta operación.",
      }),
    );
    renderWithProviders(<NotificationPoliciesPage />);
    expect(
      await screen.findByText(/reintentar no lo cambia/),
    ).toBeInTheDocument();
  });
});
