import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { AtlasApiError } from "@/shared/api/errors";
import { renderWithProviders } from "../../helpers/render-with-providers";

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
