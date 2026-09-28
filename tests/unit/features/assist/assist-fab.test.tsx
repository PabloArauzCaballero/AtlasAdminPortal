import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

const { askAssist, getAssistConversation } = vi.hoisted(() => ({
  askAssist: vi.fn(),
  getAssistConversation: vi.fn(),
}));
vi.mock("@/features/assist/services", () => ({
  askAssist,
  getAssistConversation,
}));

import { AssistFab } from "@/features/assist/assist-fab";

const HILO = {
  conversationId: "c0ffee00-0000-4000-8000-000000000001",
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

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

beforeEach(() => {
  usePathname.mockReturnValue("/internal/operations/work-queue");
  askAssist.mockReset();
  getAssistConversation.mockReset();
  getAssistConversation.mockResolvedValue(HILO);
});

afterEach(() => {
  vi.useRealTimers();
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
  return { user, panel };
}

describe("AssistFab", () => {
  it("el botón está siempre y al abrir carga el hilo, el aviso y la sección", async () => {
    const { panel } = await abrir();
    expect(getAssistConversation).toHaveBeenCalledTimes(1);
    expect(
      within(panel).getByText(
        "No escribas contraseñas, códigos ni datos personales.",
      ),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText("Estás en: Operaciones › Cola de trabajo"),
    ).toBeInTheDocument();
    expect(
      await within(panel).findByText("En «Operaciones» › «Préstamos»."),
    ).toBeInTheDocument();
  });

  it("Enter envía con la sección y un UUID v4; muestra la respuesta y la marca sin IA", async () => {
    askAssist.mockResolvedValue({
      reply: "Abre «Cola de trabajo» y elige el caso.",
      suggestHandoff: false,
      conversationId: HILO.conversationId,
      turnId: "t2",
      mode: "sin-ia",
    });
    const { user, panel } = await abrir();
    await within(panel).findByText("En «Operaciones» › «Préstamos».");
    await user.type(
      within(panel).getByRole("textbox", {
        name: "Tu pregunta para el asistente",
      }),
      "¿Qué hago aquí?{Enter}",
    );
    expect(
      await within(panel).findByText("Abre «Cola de trabajo» y elige el caso."),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText("Respuesta sin IA: texto de la guía."),
    ).toBeInTheDocument();
    const [input] = askAssist.mock.calls[0];
    expect(input).toMatchObject({
      prompt: "¿Qué hago aquí?",
      conversationId: HILO.conversationId,
      screen: "Operaciones › Cola de trabajo",
    });
    expect(input.clientMessageId).toMatch(UUID_V4);
  });

  it("Shift+Enter hace salto de línea y no envía", async () => {
    const { user, panel } = await abrir();
    const campo = within(panel).getByRole("textbox", {
      name: "Tu pregunta para el asistente",
    });
    await user.type(campo, "hola{Shift>}{Enter}{/Shift}mundo");
    expect(askAssist).not.toHaveBeenCalled();
    expect(campo).toHaveValue("hola\nmundo");
  });

  it("con el asistente apagado (404) el botón sigue, el panel lo dice y el campo queda deshabilitado", async () => {
    getAssistConversation.mockRejectedValue(
      new AtlasApiError({
        status: 404,
        code: "ASSIST_DISABLED",
        message: "apagado",
      }),
    );
    const { panel } = await abrir();
    expect(
      await within(panel).findByText(
        "El asistente todavía no está encendido en este ambiente.",
      ),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("textbox", {
        name: "Tu pregunta para el asistente",
      }),
    ).toBeDisabled();
    expect(screen.getByTestId("assist-fab")).toBeInTheDocument();
  });

  it("el 409 se reintenta en silencio con la MISMA llave hasta que llega la respuesta", async () => {
    const enCurso = new AtlasApiError({
      status: 409,
      code: "ASSIST_IN_FLIGHT",
      message: "sigue",
      retryAfterMs: 5,
    });
    askAssist
      .mockRejectedValueOnce(enCurso)
      .mockRejectedValueOnce(enCurso)
      .mockResolvedValueOnce({
        reply: "Listo.",
        suggestHandoff: false,
        conversationId: HILO.conversationId,
        turnId: "t3",
      });
    const { user, panel } = await abrir();
    await user.type(
      within(panel).getByRole("textbox", {
        name: "Tu pregunta para el asistente",
      }),
      "¿Cómo reasigno?{Enter}",
    );
    expect(await within(panel).findByText("Listo.")).toBeInTheDocument();
    expect(askAssist).toHaveBeenCalledTimes(3);
    const llaves = askAssist.mock.calls.map(([input]) => input.clientMessageId);
    expect(new Set(llaves).size).toBe(1);
    expect(within(panel).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("un fallo de red ofrece «Reintentar», que repite con la misma llave", async () => {
    askAssist
      .mockRejectedValueOnce(
        new AtlasApiError({ status: 0, code: "NETWORK_ERROR", message: "red" }),
      )
      .mockResolvedValueOnce({
        reply: "Ahora sí.",
        suggestHandoff: false,
        conversationId: HILO.conversationId,
        turnId: "t4",
      });
    const { user, panel } = await abrir();
    await user.type(
      within(panel).getByRole("textbox", {
        name: "Tu pregunta para el asistente",
      }),
      "¿Qué es la mora?{Enter}",
    );
    const alerta = await within(panel).findByRole("alert");
    await user.click(
      within(alerta).getByRole("button", { name: "Reintentar" }),
    );
    expect(await within(panel).findByText("Ahora sí.")).toBeInTheDocument();
    expect(askAssist.mock.calls[0][0].clientMessageId).toBe(
      askAssist.mock.calls[1][0].clientMessageId,
    );
  });

  it("el 400 ASSIST_REJECTED muestra el texto del servidor sin reintento", async () => {
    askAssist.mockRejectedValue(
      new AtlasApiError({
        status: 400,
        code: "ASSIST_REJECTED",
        message: "No compartas números de documento.",
      }),
    );
    const { user, panel } = await abrir();
    await user.type(
      within(panel).getByRole("textbox", {
        name: "Tu pregunta para el asistente",
      }),
      "mi carnet es 123{Enter}",
    );
    const alerta = await within(panel).findByRole("alert");
    expect(alerta).toHaveTextContent("No compartas números de documento.");
    expect(
      within(alerta).queryByRole("button", { name: "Reintentar" }),
    ).not.toBeInTheDocument();
  });

  it("Escape cierra y el foco vuelve al botón", async () => {
    const { user } = await abrir();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "Asistente de Atlas" }),
    ).toHaveFocus();
  });
});
