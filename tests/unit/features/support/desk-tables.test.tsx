import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";
import { apiRequest } from "@/shared/api/client";
import { ChatsEnEspera } from "@/features/support/desk-panel";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import { elegirOpcion } from "../../shared/option-select-helpers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

/**
 * Las dos listas de la mesa del agente como tabla homogénea: «Mis conversaciones» y «Conversaciones
 * en espera». Antes eran tarjetas que cortaban a 50 sin decirlo, sin buscador y sin paginación.
 */
const request = vi.mocked(apiRequest);
type Llamada = { path: string; query: Record<string, unknown> };
const llamadas: Llamada[] = [];
const de = (path: string) => llamadas.filter((l) => l.path === path);

const meta = (page: unknown, total: number) => ({
  page: Number(page ?? 1),
  limit: 20,
  total,
  totalPages: Math.ceil(total / 20),
});
const canal = (id: string, extra: Record<string, unknown> = {}) => ({
  channelId: id,
  channelCode: `CH-${id}`,
  caseId: null,
  status: "QUEUED",
  channelType: "CHAT",
  requestedAt: "2026-09-26T20:00:00Z",
  ...extra,
});

let colaFalla = false;
let miasTotal = 3;

beforeEach(() => {
  llamadas.length = 0;
  push.mockReset();
  colaFalla = false;
  miasTotal = 3;
  request.mockReset();
  request.mockImplementation(async (path, options) => {
    const query = (options?.query ?? {}) as Record<string, unknown>;
    llamadas.push({ path, query });
    if (options?.method === "POST") return { channelId: "5" };
    if (path === "/internal/support/desk/queue") {
      if (colaFalla) {
        colaFalla = false;
        throw new AtlasApiError({
          status: 500,
          code: "X",
          message: "La cola no respondió.",
          requestId: "req-1",
        });
      }
      const vacia = query.q === "nada";
      return {
        channels: vacia
          ? []
          : [
              canal(`${100 + Number(query.page ?? 1)}`, {
                caseId: query.page === 2 ? null : "40",
              }),
            ],
        meta: meta(query.page, vacia ? 0 : 45),
        summary: { total: 45, withoutCase: 3, oldestRequestedAt: null },
      };
    }
    // /internal/support/desk/mine (también lo usa la presencia, con limit 1)
    const vacia = query.q === "nada";
    return {
      agentProfileId: "9",
      presenceState: "AVAILABLE",
      channels:
        miasTotal === 0 || vacia
          ? []
          : [
              canal("8", {
                status: "WAITING_AGENT",
                caseId: "41",
                openedAt: "2026-09-26T20:01:00Z",
              }),
            ],
      meta: meta(query.page, vacia || miasTotal === 0 ? 0 : miasTotal),
      summary: { total: miasTotal, waitingAgent: 2, withoutCase: 0 },
    };
  });
});

describe("Conversaciones en espera (tabla)", () => {
  it("es una tabla con cabeceras; el contador sale del resumen del servidor y no de la página", async () => {
    renderWithProviders(<ChatsEnEspera />);
    const seccion = await screen.findByRole("region", {
      name: "Conversaciones en espera",
    });
    const tabla = await within(seccion).findByRole("table");
    for (const cabecera of [
      "Conversación",
      "Tipo",
      "Expediente",
      "Esperando desde",
    ])
      expect(
        within(tabla).getByRole("columnheader", { name: new RegExp(cabecera) }),
      ).toBeInTheDocument();
    expect(within(tabla).getByText("CH-101")).toBeInTheDocument();
    // 45 esperan en total (resumen), aunque la página trae una fila.
    expect(
      within(seccion).getByRole("heading", { name: "Conversaciones en espera" })
        .parentElement,
    ).toHaveTextContent("45");
    expect(de("/internal/support/desk/queue").at(-1)?.query).toMatchObject({
      page: 1,
      limit: 20,
    });
  });

  it("el buscador y el tipo de canal viajan al servidor y la paginación sigue a meta", async () => {
    renderWithProviders(<ChatsEnEspera />);
    const seccion = await screen.findByRole("region", {
      name: "Conversaciones en espera",
    });
    await within(seccion).findByText("CH-101");

    fireEvent.change(
      within(seccion).getByRole("textbox", { name: /código, n.º/i }),
      { target: { value: "50%" } },
    );
    await waitFor(() =>
      expect(de("/internal/support/desk/queue").at(-1)?.query).toMatchObject({
        q: "50%",
        page: 1,
      }),
    );
    await elegirOpcion(
      within(seccion).getByRole("combobox", { name: /^Canal/ }),
      "ASYNC_MESSAGING",
    );
    await waitFor(() =>
      expect(de("/internal/support/desk/queue").at(-1)?.query).toMatchObject({
        q: "50%",
        channelType: "ASYNC_MESSAGING",
      }),
    );

    await userEvent.click(
      within(seccion).getByRole("button", { name: /siguiente/i }),
    );
    expect(await within(seccion).findByText("CH-102")).toBeInTheDocument();
    expect(de("/internal/support/desk/queue").at(-1)?.query).toMatchObject({
      page: 2,
    });
  });

  it("«nada coincide» no es «nadie espera»: cada vacío dice lo suyo", async () => {
    renderWithProviders(<ChatsEnEspera />);
    const seccion = await screen.findByRole("region", {
      name: "Conversaciones en espera",
    });
    await within(seccion).findByText("CH-101");
    fireEvent.change(
      within(seccion).getByRole("textbox", { name: /código, n.º/i }),
      { target: { value: "nada" } },
    );
    expect(
      await within(seccion).findByText(
        "Ninguna conversación en espera coincide con la búsqueda.",
      ),
    ).toBeInTheDocument();
    expect(
      within(seccion).queryByText("Nadie está esperando en el chat."),
    ).toBeNull();
    // El buscador sigue en pantalla: no se desmonta mientras llega la respuesta.
    expect(
      within(seccion).getByRole("textbox", { name: /código, n.º/i }),
    ).toBeInTheDocument();
  });

  it("si la cola falla dice por qué y «Reintentar» la vuelve a pedir", async () => {
    colaFalla = true;
    renderWithProviders(<ChatsEnEspera />);
    expect(
      await screen.findByText("La cola no respondió."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(await screen.findByText("CH-101")).toBeInTheDocument();
  });

  it("«Atender» toma ESA conversación y lleva a su expediente", async () => {
    renderWithProviders(<ChatsEnEspera />);
    const seccion = await screen.findByRole("region", {
      name: "Conversaciones en espera",
    });
    await within(seccion).findByText("CH-101");
    await userEvent.click(
      within(seccion).getByRole("button", { name: "Atender" }),
    );
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/internal/support/cases/40"),
    );
    expect(request.mock.calls.find(([, o]) => o?.method === "POST")?.[0]).toBe(
      "/internal/support/desk/channels/101/claim",
    );
  });

  it("un agente sin perfil (403) no repite el aviso: la bandeja de arriba ya lo explica", async () => {
    request.mockRejectedValue(
      new AtlasApiError({
        status: 403,
        code: "SUPPORT_AGENT_PROFILE_REQUIRED",
        message: "Sin perfil de agente.",
      }),
    );
    const { container } = renderWithProviders(<ChatsEnEspera />);
    await waitFor(() => expect(request).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: /en espera/i })).toBeNull(),
    );
    expect(container.textContent).not.toContain("Sin perfil de agente.");
  });
});

describe("Mis conversaciones (tabla)", () => {
  it("es una tabla con estado y enlace a la ficha; el contador y los avisos salen del resumen", async () => {
    renderWithProviders(<ChatsEnEspera />);
    const seccion = await screen.findByRole("region", {
      name: "Mis conversaciones",
    });
    const tabla = await within(seccion).findByRole("table");
    for (const cabecera of ["Conversación", "Estado", "Expediente", "Abierta"])
      expect(
        within(tabla).getByRole("columnheader", { name: new RegExp(cabecera) }),
      ).toBeInTheDocument();
    expect(
      within(tabla).getByRole("link", { name: "Abrir y responder" }),
    ).toHaveAttribute("href", "/internal/support/cases/41");
    expect(within(tabla).getByText("Esperando tu respuesta")).toBeVisible();
    expect(
      within(seccion).getByRole("heading", { name: "Mis conversaciones" })
        .parentElement,
    ).toHaveTextContent("3");
    expect(
      within(seccion).getByText("2 esperan tu respuesta"),
    ).toBeInTheDocument();
  });

  it("el buscador y el estado viajan al servidor", async () => {
    renderWithProviders(<ChatsEnEspera />);
    const seccion = await screen.findByRole("region", {
      name: "Mis conversaciones",
    });
    await within(seccion).findByRole("table");
    fireEvent.change(
      within(seccion).getByRole("textbox", { name: /código, n.º/i }),
      { target: { value: "41" } },
    );
    await elegirOpcion(
      within(seccion).getByRole("combobox", { name: /^Estado/ }),
      "WAITING_AGENT",
    );
    await waitFor(() => {
      const ultima = de("/internal/support/desk/mine").at(-1)?.query;
      expect(ultima).toMatchObject({
        q: "41",
        status: "WAITING_AGENT",
        page: 1,
        limit: 20,
      });
    });
  });

  it("un filtro sin resultados lo dice; sin conversaciones mías no se pinta nada", async () => {
    renderWithProviders(<ChatsEnEspera />);
    const seccion = await screen.findByRole("region", {
      name: "Mis conversaciones",
    });
    await within(seccion).findByRole("table");
    fireEvent.change(
      within(seccion).getByRole("textbox", { name: /código, n.º/i }),
      { target: { value: "nada" } },
    );
    expect(
      await within(seccion).findByText(
        "Ninguna de tus conversaciones coincide con la búsqueda.",
      ),
    ).toBeInTheDocument();
  });

  it("sin conversaciones mías (resumen en 0) la sección no aparece", async () => {
    miasTotal = 0;
    renderWithProviders(<ChatsEnEspera />);
    await screen.findByRole("region", { name: "Conversaciones en espera" });
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Mis conversaciones" }),
      ).toBeNull(),
    );
  });
});
