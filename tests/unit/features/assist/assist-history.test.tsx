import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

const svc = vi.hoisted(() => ({
  askAssist: vi.fn(),
  getAssistConversation: vi.fn(),
  listAssistConversations: vi.fn(),
  getAssistConversationById: vi.fn(),
  deleteAssistConversation: vi.fn(),
}));
vi.mock("@/features/assist/services", () => svc);

import { AssistFab } from "@/features/assist/assist-fab";

const ACTUAL = {
  conversationId: "c-actual",
  turns: [
    {
      turnId: "t1",
      prompt: "¿Dónde veo los préstamos?",
      reply: "En «Operaciones» › «Préstamos».",
      suggestHandoff: false,
      createdAt: "2026-09-27T10:00:00.000Z",
    },
  ],
};
const OTRA = {
  conversationId: "c-otra",
  title: "Cómo atiendo un caso",
  turns: [
    {
      turnId: "o1",
      prompt: "¿Cómo atiendo un caso?",
      reply: "Abre la cola de trabajo.",
      suggestHandoff: false,
      createdAt: "2026-09-26T10:00:00.000Z",
    },
  ],
};
const LISTA = [
  {
    conversationId: "c-actual",
    title: "Dónde veo los préstamos",
    updatedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    turnCount: 1,
  },
  {
    conversationId: "c-otra",
    title: "Cómo atiendo un caso",
    updatedAt: new Date(Date.now() - 26 * 3_600_000).toISOString(),
    turnCount: 3,
  },
];

beforeEach(() => {
  usePathname.mockReturnValue("/internal/operations/work-queue");
  Object.values(svc).forEach((fn) => fn.mockReset());
  svc.getAssistConversation.mockResolvedValue(ACTUAL);
  svc.listAssistConversations.mockResolvedValue(LISTA);
  svc.getAssistConversationById.mockResolvedValue(OTRA);
  svc.deleteAssistConversation.mockResolvedValue({ deleted: 1 });
});

async function abrir() {
  const user = userEvent.setup();
  render(<AssistFab />);
  await user.click(
    await screen.findByRole("button", { name: "Asistente de Atlas" }),
  );
  const panel = await screen.findByRole("dialog", {
    name: "Asistente de Atlas",
  });
  await screen.findByText("En «Operaciones» › «Préstamos».");
  return { user, panel };
}

const verHistorial = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Historial" }));
  return screen.findByRole("heading", { name: "Historial de conversaciones" });
};

describe("Nueva conversación", () => {
  it("vacía el hilo sin llamar al servidor y la siguiente pregunta no lleva conversationId", async () => {
    const { user } = await abrir();
    svc.askAssist.mockResolvedValue({
      reply: "Respuesta nueva",
      suggestHandoff: false,
      conversationId: "c-nueva",
      turnId: "n1",
    });
    await user.click(
      screen.getByRole("button", { name: "Nueva conversación" }),
    );
    expect(screen.queryByText("En «Operaciones» › «Préstamos».")).toBeNull();
    expect(svc.listAssistConversations).not.toHaveBeenCalled();
    expect(svc.askAssist).not.toHaveBeenCalled();
    await user.type(
      screen.getByLabelText("Tu pregunta para el asistente"),
      "Hola{Enter}",
    );
    await screen.findByText("Respuesta nueva");
    expect(svc.askAssist.mock.calls[0][0]).not.toHaveProperty("conversationId");
  });

  it("está deshabilitada con el hilo vacío, y lo dice", async () => {
    svc.getAssistConversation.mockResolvedValue({
      conversationId: null,
      turns: [],
    });
    const user = userEvent.setup();
    render(<AssistFab />);
    await user.click(
      await screen.findByRole("button", { name: "Asistente de Atlas" }),
    );
    const boton = await screen.findByRole("button", {
      name: "Nueva conversación",
    });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAccessibleDescription(
      "Ya estás en una conversación nueva.",
    );
  });

  it("está deshabilitada mientras hay un envío en curso", async () => {
    const { user } = await abrir();
    svc.askAssist.mockReturnValue(new Promise(() => {}));
    await user.type(
      screen.getByLabelText("Tu pregunta para el asistente"),
      "Hola{Enter}",
    );
    const boton = screen.getByRole("button", { name: "Nueva conversación" });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAccessibleDescription(/Espera a que el asistente/);
  });
});

describe("Historial", () => {
  it("lista título, fecha relativa y mensajes, y marca la conversación actual", async () => {
    const { user } = await abrir();
    await verHistorial(user);
    const filas = await screen.findAllByRole("listitem");
    expect(filas).toHaveLength(2);
    expect(within(filas[0]).getByText("hace 5 min · 2 mensajes")).toBeVisible();
    expect(within(filas[1]).getByText("ayer · 6 mensajes")).toBeVisible();
    expect(
      within(filas[0]).getByRole("button", { name: /^Dónde veo/ }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("abrir una conversación carga su hilo, vuelve al chat y sigue con su conversationId", async () => {
    const { user } = await abrir();
    await verHistorial(user);
    await user.click(
      await screen.findByRole("button", { name: /^Cómo atiendo/ }),
    );
    await screen.findByText("Abre la cola de trabajo.");
    expect(svc.getAssistConversationById).toHaveBeenCalledWith("c-otra");
    expect(
      screen.queryByRole("heading", { name: "Historial de conversaciones" }),
    ).toBeNull();
    svc.askAssist.mockResolvedValue({
      reply: "Sigue",
      suggestHandoff: false,
      conversationId: "c-otra",
      turnId: "o2",
    });
    await user.type(
      screen.getByLabelText("Tu pregunta para el asistente"),
      "Y luego{Enter}",
    );
    await screen.findByText("Sigue");
    expect(svc.askAssist.mock.calls[0][0]).toMatchObject({
      conversationId: "c-otra",
    });
  });

  it("borrar pide confirmación en la fila, sin diálogos del navegador", async () => {
    const confirmar = vi.spyOn(window, "confirm");
    const { user } = await abrir();
    await verHistorial(user);
    await user.click(
      await screen.findByRole("button", {
        name: "Borrar la conversación «Cómo atiendo un caso»",
      }),
    );
    expect(svc.deleteAssistConversation).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(svc.deleteAssistConversation).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", {
        name: "Borrar la conversación «Cómo atiendo un caso»",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Sí, borrar" }));
    await waitFor(() =>
      expect(svc.deleteAssistConversation).toHaveBeenCalledWith("c-otra"),
    );
    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(1),
    );
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("borrar la conversación abierta reinicia el hilo", async () => {
    const { user } = await abrir();
    await verHistorial(user);
    await user.click(
      await screen.findByRole("button", {
        name: "Borrar la conversación «Dónde veo los préstamos»",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Sí, borrar" }));
    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(1),
    );
    await user.click(screen.getByRole("button", { name: "Volver al chat" }));
    expect(screen.queryByText("En «Operaciones» › «Préstamos».")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Nueva conversación" }),
    ).toBeDisabled();
  });

  it("estado vacío", async () => {
    svc.listAssistConversations.mockResolvedValue([]);
    const { user } = await abrir();
    await verHistorial(user);
    await screen.findByText(/Todavía no tienes conversaciones guardadas/);
  });

  it("si la lista falla lo dice, deja reintentar y el chat sigue funcionando", async () => {
    svc.listAssistConversations.mockRejectedValueOnce(
      new AtlasApiError({ status: 500, code: "X", message: "boom" }),
    );
    const { user } = await abrir();
    await verHistorial(user);
    await screen.findByText(/No se pudo cargar el historial/);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findAllByRole("listitem")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Volver al chat" }));
    expect(
      screen.getByLabelText("Tu pregunta para el asistente"),
    ).toBeEnabled();
  });

  it("si la conversación ya no existe (404) avisa y la quita de la lista", async () => {
    svc.getAssistConversationById.mockRejectedValue(
      new AtlasApiError({ status: 404, code: "NOT_FOUND", message: "no" }),
    );
    const { user } = await abrir();
    await verHistorial(user);
    await user.click(
      await screen.findByRole("button", { name: /^Cómo atiendo/ }),
    );
    await screen.findByText("Esa conversación ya no existe.");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("si abrir o borrar falla por otra causa, avisa y conserva la fila", async () => {
    svc.getAssistConversationById.mockRejectedValue(new Error("x"));
    svc.deleteAssistConversation.mockRejectedValue(new Error("x"));
    const { user } = await abrir();
    await verHistorial(user);
    await user.click(
      await screen.findByRole("button", { name: /^Cómo atiendo/ }),
    );
    await screen.findByText(/No se pudo abrir esa conversación/);
    await user.click(
      screen.getByRole("button", {
        name: "Borrar la conversación «Cómo atiendo un caso»",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Sí, borrar" }));
    await screen.findByText(/No se pudo borrar la conversación/);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
