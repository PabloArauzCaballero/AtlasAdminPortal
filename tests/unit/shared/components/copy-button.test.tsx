import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyButton, CopyableCode } from "@/shared/components/ui/copy-button";

/**
 * jsdom no trae `navigator.clipboard`, así que se instala un doble. Se guarda el
 * texto copiado porque el bug que importa aquí es copiar algo distinto de lo que
 * se ve (p. ej. el valor sin formatear).
 */
let copiado: string[] = [];

beforeEach(() => {
  copiado = [];
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: vi.fn(async (text: string) => {
        copiado.push(text);
      }),
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CopyButton", () => {
  it("tiene nombre accesible (es un botón solo de icono)", () => {
    render(<CopyButton value="abc" />);

    expect(screen.getByRole("button", { name: "Copiar" })).toBeInTheDocument();
  });

  it("copia exactamente el valor recibido", async () => {
    render(<CopyButton value="req_abc123" />);

    await userEvent.click(screen.getByRole("button", { name: "Copiar" }));

    expect(copiado).toEqual(["req_abc123"]);
  });

  it("copia una cadena vacía sin romperse", async () => {
    render(<CopyButton value="" />);

    await userEvent.click(screen.getByRole("button", { name: "Copiar" }));

    expect(copiado).toEqual([""]);
  });

  it("copiar dos veces escribe las dos veces (el acuse no bloquea)", async () => {
    render(<CopyButton value="x" />);
    const boton = screen.getByRole("button", { name: "Copiar" });

    await userEvent.click(boton);
    await userEvent.click(boton);

    expect(copiado).toEqual(["x", "x"]);
  });

  it("mantiene el nombre accesible tras copiar (el icono cambia, el label no)", async () => {
    render(<CopyButton value="x" />);

    await userEvent.click(screen.getByRole("button", { name: "Copiar" }));

    expect(screen.getByRole("button", { name: "Copiar" })).toBeInTheDocument();
  });
});

describe("CopyButton · acuse temporal", () => {
  // Se usa `fireEvent` y no `userEvent`: userEvent instala sus propios timers y
  // con `useFakeTimers` el click se queda esperando para siempre.
  it("marca el copiado y lo revierte a los 1.5 s", async () => {
    vi.useFakeTimers();
    const { container } = render(<CopyButton value="x" />);
    const marca = () => container.querySelector(".text-emerald-600");

    fireEvent.click(screen.getByRole("button", { name: "Copiar" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(marca()).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(marca()).toBeNull();
  });
});

describe("CopyableCode", () => {
  it("muestra el valor y copia ese mismo texto", async () => {
    render(<CopyableCode value="SELECT 1" />);

    expect(screen.getByText("SELECT 1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Copiar" }));

    expect(copiado).toEqual(["SELECT 1"]);
  });

  it("un valor muy largo se copia entero, no truncado a lo que se ve", async () => {
    const largo = "a".repeat(5000);
    render(<CopyableCode value={largo} />);

    await userEvent.click(screen.getByRole("button", { name: "Copiar" }));

    expect(copiado[0]).toHaveLength(5000);
  });
});
