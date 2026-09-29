import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { AtlasApiError } from "@/shared/api/errors";
import { renderWithProviders } from "../../helpers/render-with-providers";
import { elegirOpcion } from "../shared/option-select-helpers";

const mockUseAuth = vi.fn();
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));

const { AppContentPage } =
  await import("@/features/app-content/app-content-page");
const { NotificationPoliciesPage } =
  await import("@/features/notification-policies/notification-policies-page");

const request = vi.mocked(apiRequest);

function pieza(contentKey: string, title: string) {
  return {
    contentId: contentKey,
    surface: "faq",
    contentKey,
    locale: "es-BO",
    title,
    subtitle: null,
    bodyMd: null,
    bullets: [],
    metadata: {},
    actionKind: null,
    actionLabel: null,
    actionValue: null,
    resolvedAction: null,
    displayOrder: 1,
    isActive: true,
    publishedAt: null,
    updatedAt: null,
  };
}

function listado(
  items: unknown[],
  total: number,
  summary = { total, visible: total, hidden: 0 },
) {
  return {
    items,
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

describe("Contenido de la app", () => {
  beforeEach(() => {
    request.mockReset();
    mockUseAuth.mockReset();
  });

  it("con las preguntas frecuentes vacías dice lo que ve el cliente y deja publicar la primera", async () => {
    asManager();
    request.mockImplementation((_path, options) =>
      options?.method === "PUT"
        ? Promise.resolve({})
        : Promise.resolve({ items: [] }),
    );
    renderWithProviders(<AppContentPage />);

    expect(
      await screen.findByText(/sale sin preguntas frecuentes/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/textos por defecto/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("app-content-new-button"));
    fireEvent.change(screen.getByTestId("new-content-key"), {
      target: { value: "faq.como-se-calcula-mi-linea" },
    });
    fireEvent.change(screen.getByTestId("new-content-title"), {
      target: { value: "¿Cómo se calcula mi línea?" },
    });
    fireEvent.click(screen.getByTestId("new-content-save"));

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/operations/app-content",
        expect.objectContaining({
          method: "PUT",
          body: expect.objectContaining({
            surface: "faq",
            contentKey: "faq.como-se-calcula-mi-linea",
            title: "¿Cómo se calcula mi línea?",
          }),
        }),
      ),
    );
  });

  it("el celular enseña el texto mientras se escribe, sin guardar", async () => {
    asManager();
    request.mockResolvedValue({ items: [] });
    renderWithProviders(<AppContentPage />);

    const phone = await screen.findByTestId("app-content-phone");
    expect(phone).toHaveTextContent("Nada publicado todavía");

    fireEvent.click(screen.getByTestId("app-content-new-button"));
    expect(phone).toHaveTextContent("Empieza a escribir");

    fireEvent.change(screen.getByTestId("new-content-title"), {
      target: { value: "¿Cómo se calcula mi línea?" },
    });
    fireEvent.change(screen.getByTestId("new-content-body"), {
      target: { value: "Depende de tus ingresos." },
    });
    expect(phone).toHaveTextContent("¿Cómo se calcula mi línea?");
    expect(phone).toHaveTextContent("Depende de tus ingresos.");
    expect(request).not.toHaveBeenCalledWith(
      "/operations/app-content",
      expect.objectContaining({ method: "PUT" }),
    );

    fireEvent.click(screen.getByText("Cancelar"));
    await waitFor(() =>
      expect(phone).not.toHaveTextContent("¿Cómo se calcula mi línea?"),
    );
  });

  it("no deja publicar una clave con espacios", async () => {
    asManager();
    request.mockResolvedValue({ items: [] });
    renderWithProviders(<AppContentPage />);

    fireEvent.click(await screen.findByTestId("app-content-new-button"));
    fireEvent.change(screen.getByTestId("new-content-key"), {
      target: { value: "Mi pregunta" },
    });
    fireEvent.change(screen.getByTestId("new-content-title"), {
      target: { value: "Título" },
    });

    expect(screen.getByText(/sin espacios/)).toBeInTheDocument();
    expect(screen.getByTestId("new-content-save")).toBeDisabled();
  });

  it("sin permiso de gestión no ofrece publicar ni editar", async () => {
    asReader();
    request.mockResolvedValue({
      items: [
        {
          contentId: "1",
          surface: "faq",
          contentKey: "faq.uno",
          locale: "es-BO",
          title: "Una pregunta",
          subtitle: null,
          bodyMd: null,
          bullets: [],
          metadata: {},
          actionKind: null,
          actionLabel: null,
          actionValue: null,
          resolvedAction: null,
          displayOrder: 1,
          isActive: true,
          publishedAt: null,
          updatedAt: null,
        },
      ],
    });
    renderWithProviders(<AppContentPage />);

    expect(
      await within(await screen.findByTestId("app-content-list")).findByText(
        "Una pregunta",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("edit-faq.uno")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("app-content-new-button"),
    ).not.toBeInTheDocument();
  });

  it("Inicio, Perfil y Crédito ya llegan a la app y dicen dónde salen", async () => {
    asManager();
    request.mockResolvedValue({ items: [] });
    renderWithProviders(<AppContentPage />);

    for (const [surface, donde] of [
      ["home", /bajo el saludo/],
      ["profile", /arriba del todo/],
      ["credit", /bajo el puntaje/],
    ] as const) {
      fireEvent.click(await screen.findByTestId(`surface-${surface}`));
      expect(await screen.findByText(donde)).toBeInTheDocument();
      expect(screen.queryByTestId("surface-not-read")).not.toBeInTheDocument();
    }
  });

  it("la colección es una tabla con cabeceras y Editar en la columna de acciones", async () => {
    asManager();
    request.mockResolvedValue(listado([pieza("faq.uno", "Una pregunta")], 1));
    renderWithProviders(<AppContentPage />);

    const tabla = await screen.findByRole("table");
    for (const cabecera of [
      "Pieza",
      "Orden",
      "Texto",
      "Botón",
      "Estado",
      "Acciones",
    ]) {
      expect(
        within(tabla).getByRole("columnheader", { name: cabecera }),
      ).toBeInTheDocument();
    }
    const fila = within(tabla).getByText("Una pregunta").closest("tr");
    expect(
      within(fila as HTMLElement).getByTestId("edit-faq.uno"),
    ).toBeInTheDocument();
    expect(
      within(fila as HTMLElement).getByText("visible"),
    ).toBeInTheDocument();
  });

  it("el buscador, la visibilidad y la página viajan al servidor y el resumen sale del servidor", async () => {
    asManager();
    const consultas: Array<Record<string, unknown>> = [];
    request.mockImplementation((_path, options) => {
      const query = (options?.query ?? {}) as Record<string, unknown>;
      consultas.push(query);
      return Promise.resolve(
        listado([pieza("faq.uno", "Una pregunta")], 45, {
          total: 45,
          visible: 40,
          hidden: 5,
        }),
      );
    });
    renderWithProviders(<AppContentPage />);
    await screen.findByRole("table");
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("Visibles en la app")).toBeInTheDocument();

    fireEvent.change(
      screen.getByRole("textbox", { name: /título, clave o texto/i }),
      { target: { value: "línea" } },
    );
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({
        surface: "faq",
        q: "línea",
        page: 1,
      }),
    );
    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Visibilidad/ }),
      "false",
    );
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ active: "false", q: "línea" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ page: 2, active: "false" }),
    );
  });

  it("sin coincidencias dice que nada coincide, y sin piezas dice lo que ve el cliente", async () => {
    asManager();
    request.mockResolvedValue(listado([], 0));
    renderWithProviders(<AppContentPage />);
    expect(
      await screen.findByText("Todavía no hay contenido para esta pantalla"),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", { name: /título, clave o texto/i }),
      { target: { value: "zzz" } },
    );
    expect(
      await screen.findByText("Ninguna pieza coincide con la búsqueda."),
    ).toBeInTheDocument();
  });

  it("un error del servidor se ve con Reintentar", async () => {
    asManager();
    request.mockRejectedValue(
      new AtlasApiError({ status: 500, code: "X", message: "caído" }),
    );
    renderWithProviders(<AppContentPage />);
    expect(
      await screen.findByRole("button", { name: /reintentar/i }),
    ).toBeInTheDocument();
  });

  it("Editar abre el formulario encima de la tabla y el celular enseña lo que se escribe", async () => {
    asManager();
    request.mockResolvedValue(listado([pieza("faq.uno", "Una pregunta")], 1));
    renderWithProviders(<AppContentPage />);
    fireEvent.click(await screen.findByTestId("edit-faq.uno"));

    const titulo = await screen.findByTestId("title-faq.uno");
    fireEvent.change(titulo, { target: { value: "Título nuevo" } });
    expect(screen.getByTestId("app-content-phone")).toHaveTextContent(
      "Título nuevo",
    );
    expect(request).not.toHaveBeenCalledWith(
      "/operations/app-content",
      expect.objectContaining({ method: "PUT" }),
    );
    fireEvent.click(screen.getByText("Cancelar"));
    await waitFor(() =>
      expect(screen.queryByTestId("title-faq.uno")).not.toBeInTheDocument(),
    );
  });

  it("el celular enseña lo publicado de la pantalla, no lo que filtra la tabla", async () => {
    asManager();
    const consultas: Array<Record<string, unknown>> = [];
    request.mockImplementation((_path, options) => {
      const query = (options?.query ?? {}) as Record<string, unknown>;
      consultas.push(query);
      return Promise.resolve(listado([pieza("faq.uno", "Una pregunta")], 1));
    });
    renderWithProviders(<AppContentPage />);
    await screen.findByRole("table");
    expect(consultas.some((q) => q.active === "true" && q.limit === 100)).toBe(
      true,
    );
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
    renderWithProviders(<AppContentPage />);

    expect(
      await screen.findByText(/reintentar no lo cambia/),
    ).toBeInTheDocument();
  });
});

describe("Políticas de notificación", () => {
  const policy = {
    policyId: "7",
    eventCode: "cuota_vencida",
    channel: "push",
    label: "Cuota vencida",
    description: null,
    category: "pagos",
    icon: null,
    isMandatory: true,
    defaultEnabled: true,
    mandatoryReason: "Es un aviso de mora.",
    displayOrder: 1,
    isActive: true,
    updatedAt: null,
  };

  beforeEach(() => {
    request.mockReset();
    mockUseAuth.mockReset();
  });

  it("sólo quien gestiona ve el botón de editar", async () => {
    asReader();
    request.mockResolvedValue({ data: [policy] });
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
});
