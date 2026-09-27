import { elegirOpcion } from "../../../shared/option-select-helpers";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QaSeedField } from "@/features/qa-lab/fakers/qa-seed-field";
import { NEW_PEOPLE_SEED } from "@/features/qa-lab/qa-seed-catalog";

vi.setConfig({ testTimeout: 30000 });

afterEach(() => {
  vi.useRealTimers();
});

describe("QaSeedField · qué lote de personas se usa", () => {
  it("elegir una semilla con nombre la pasa tal cual", async () => {
    const onChange = vi.fn();
    render(<QaSeedField seed="qa-base" onChange={onChange} />);
    await elegirOpcion(
      screen.getByRole("combobox", { name: /Personas de prueba/ }),
      "qa-regresion",
    );
    expect(onChange).toHaveBeenLastCalledWith("qa-regresion");
  });

  it("«Personas nuevas» inventa una semilla única y visible", async () => {
    const onChange = vi.fn();
    render(<QaSeedField seed="qa-base" onChange={onChange} />);
    await elegirOpcion(
      screen.getByRole("combobox", { name: /Personas de prueba/ }),
      NEW_PEOPLE_SEED,
    );
    expect(onChange).toHaveBeenLastCalledWith(
      expect.stringMatching(/^qa-\d{8}-\d{6}$/),
    );
  });

  it("se puede pegar la semilla de otra corrida", () => {
    const onChange = vi.fn();
    render(<QaSeedField seed="qa-base" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox", { name: /Semilla/ }), {
      target: { value: "qa-20260926-181502" },
    });
    expect(onChange).toHaveBeenLastCalledWith("qa-20260926-181502");
  });

  it("copiar la semilla la deja en el portapapeles y lo confirma un momento", async () => {
    const writeText = vi.fn(async () => undefined);
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<QaSeedField seed="qa-propia" onChange={vi.fn()} />);

    const boton = screen.getByRole("button", { name: "Copiar la semilla" });
    await user.click(boton);
    expect(writeText).toHaveBeenCalledWith("qa-propia");
    expect(boton.querySelector(".lucide-check")).not.toBeNull();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1600));
    });
    expect(boton.querySelector(".lucide-check")).toBeNull();
  });
});
