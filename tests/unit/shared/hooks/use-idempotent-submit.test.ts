import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useIdempotentSubmit } from "@/shared/hooks/use-idempotent-submit";

/** Promesa que se resuelve manualmente, para controlar el timing. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("useIdempotentSubmit", () => {
  it("pasa una llave al action y marca isSubmitting mientras corre", async () => {
    const d = deferred<string>();
    const action = vi.fn((_key: string) => d.promise);
    const { result } = renderHook(() => useIdempotentSubmit(action));

    let submitPromise: Promise<unknown> = Promise.resolve();
    act(() => {
      submitPromise = result.current.submit();
    });

    expect(result.current.isSubmitting).toBe(true);
    expect(action).toHaveBeenCalledOnce();
    expect(action.mock.calls[0][0].length).toBeGreaterThan(0);

    await act(async () => {
      d.resolve("ok");
      await submitPromise;
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it("ignora un segundo submit mientras el primero sigue en vuelo", async () => {
    const d = deferred<string>();
    const action = vi.fn((_key: string) => d.promise);
    const { result } = renderHook(() => useIdempotentSubmit(action));

    let first: Promise<unknown> = Promise.resolve();
    await act(async () => {
      first = result.current.submit();
      await result.current.submit(); // segundo clic: debe ser ignorado
    });

    expect(action).toHaveBeenCalledOnce();

    await act(async () => {
      d.resolve("ok");
      await first;
    });
  });

  it("rota la llave tras un envío exitoso (acción distinta = llave distinta)", async () => {
    const action = vi.fn((_key: string) => Promise.resolve("ok"));
    const { result } = renderHook(() => useIdempotentSubmit(action));

    await act(async () => {
      await result.current.submit();
    });
    await act(async () => {
      await result.current.submit();
    });

    expect(action).toHaveBeenCalledTimes(2);
    expect(action.mock.calls[0][0]).not.toBe(action.mock.calls[1][0]);
  });

  it("reusa la misma llave tras un fallo (mismo intento lógico)", async () => {
    let calls = 0;
    const action = vi.fn((_key: string) => {
      calls += 1;
      return calls === 1
        ? Promise.reject(new Error("boom"))
        : Promise.resolve("ok");
    });
    const { result } = renderHook(() => useIdempotentSubmit(action));

    await act(async () => {
      await result.current.submit().catch(() => undefined);
    });
    await act(async () => {
      await result.current.submit();
    });

    expect(action).toHaveBeenCalledTimes(2);
    expect(action.mock.calls[0][0]).toBe(action.mock.calls[1][0]);
  });

  it("vuelve a permitir enviar después de terminar", async () => {
    const action = vi.fn((_key: string) => Promise.resolve("ok"));
    const { result } = renderHook(() => useIdempotentSubmit(action));

    await act(async () => {
      await result.current.submit();
    });

    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
  });
});
