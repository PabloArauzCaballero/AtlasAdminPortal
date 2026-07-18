import { render, screen, waitFor } from "@testing-library/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/shared/auth/auth-context";
import { AppProviders } from "@/shared/providers/app-providers";

vi.mock("@/shared/auth/auth-service", () => ({
  loginInternal: vi.fn(),
  getInternalMe: vi.fn(),
  logoutInternal: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

function SondaDeQuery({
  queryFn,
}: Readonly<{ queryFn: () => Promise<unknown> }>) {
  const { isError } = useQuery({ queryKey: ["sonda"], queryFn });
  return <p>{isError ? "falló" : "cargando"}</p>;
}

/**
 * Monta una query que siempre falla bajo los providers REALES: lo que se prueba
 * es la configuración del QueryClient que crea `AppProviders`, así que usar el
 * cliente de test (retry: false) no probaría nada.
 */
async function intentosAnteError(error: unknown) {
  const queryFn = vi.fn().mockRejectedValue(error);
  render(
    <AppProviders>
      <SondaDeQuery queryFn={queryFn} />
    </AppProviders>,
  );

  await waitFor(() => expect(screen.getByText("falló")).toBeInTheDocument(), {
    timeout: 5000,
  });
  return queryFn.mock.calls.length;
}

describe("AppProviders · cableado", () => {
  it("renderiza el árbol de la aplicación", () => {
    render(
      <AppProviders>
        <p>contenido</p>
      </AppProviders>,
    );

    expect(screen.getByText("contenido")).toBeInTheDocument();
  });

  it("da acceso al QueryClient a los hijos", () => {
    function Sonda() {
      return <p>{useQueryClient() ? "hay cliente" : "sin cliente"}</p>;
    }

    render(
      <AppProviders>
        <Sonda />
      </AppProviders>,
    );

    expect(screen.getByText("hay cliente")).toBeInTheDocument();
  });

  it("da acceso a la sesión a los hijos", () => {
    // Si AuthProvider no envolviera el árbol, `useAuth` lanzaría.
    function Sonda() {
      return <p>{useAuth().isHydrated ? "hidratado" : "hidratando"}</p>;
    }

    render(
      <AppProviders>
        <Sonda />
      </AppProviders>,
    );

    expect(screen.getByText("hidratado")).toBeInTheDocument();
  });
});

describe("AppProviders · política de reintentos", () => {
  // Reintentar un error de autorización no lo arregla: solo multiplica las
  // peticiones y retrasa el mensaje de error al operador.
  it.each([401, 403, 404])("no reintenta ante un %i", async (status) => {
    expect(await intentosAnteError({ status })).toBe(1);
  });

  it("un 500 sí se reintenta: puede ser transitorio", async () => {
    expect(await intentosAnteError({ status: 500 })).toBe(2);
  });

  it("un fallo de red (error sin status) se reintenta", async () => {
    expect(await intentosAnteError(new Error("Failed to fetch"))).toBe(2);
  });
});
