import { renderHook } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Avanza los timers dentro de `act` para que React procese el re-render. */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useDebouncedValue", () => {
  it("expone el valor inicial sin esperar al debounce", () => {
    // Si el primer render devolviera undefined, la vista parpadearía vacía.
    const { result } = renderHook(() => useDebouncedValue("inicial"));

    expect(result.current).toBe("inicial");
  });

  it("no propaga el valor nuevo antes de que venza el retardo", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 350),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });
    await advance(349);

    expect(result.current).toBe("a");
  });

  it("propaga el valor al vencer el retardo", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 350),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });
    await advance(350);

    expect(result.current).toBe("ab");
  });

  it("tecleo continuo solo emite el último valor, no los intermedios", async () => {
    // Es la razón de existir del hook: sin reiniciar el timer en cada cambio,
    // la búsqueda global dispararía una petición por carácter.
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 350),
      { initialProps: { value: "" } },
    );

    for (const value of ["c", "cl", "cli", "clie"]) {
      rerender({ value });
      await advance(100);
    }

    // Han pasado 400ms en total, pero nunca 350 seguidos sin teclear.
    expect(result.current).toBe("");

    await advance(350);
    expect(result.current).toBe("clie");
  });

  it("usa 350ms por defecto cuando no se pasa retardo", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "b" });
    await advance(349);
    expect(result.current).toBe("a");

    await advance(1);
    expect(result.current).toBe("b");
  });

  it("respeta un retardo personalizado", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 1000),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "b" });
    await advance(350);
    expect(result.current).toBe("a");

    await advance(650);
    expect(result.current).toBe("b");
  });

  it("con retardo 0 propaga en el siguiente tick, sin quedarse pegado", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 0),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "b" });
    await advance(0);

    expect(result.current).toBe("b");
  });

  it("volver al valor anterior dentro de la ventana no emite nada", async () => {
    // Teclear y borrar deja el valor donde estaba: no debe refetchear.
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 350),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });
    await advance(100);
    rerender({ value: "a" });
    await advance(350);

    expect(result.current).toBe("a");
  });

  it("cancela el timer pendiente al desmontar", async () => {
    // Un setState tras el desmontaje es una fuga: el cleanup debe limpiarlo.
    const { rerender, unmount } = renderHook(
      ({ value }) => useDebouncedValue(value, 350),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "b" });
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("funciona con valores no string (objetos de filtros)", async () => {
    const initial = { page: 1 };
    const next = { page: 2 };
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 350),
      { initialProps: { value: initial } },
    );

    rerender({ value: next });
    await advance(350);

    expect(result.current).toBe(next);
  });
});
