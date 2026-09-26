import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccesoASoporte } from "@/features/support/support-access-state";
import { AtlasApiError } from "@/shared/api/errors";

/**
 * El 403 que hacía parecer rota una pantalla que funcionaba.
 *
 * `internal/support/*` exige dos cosas distintas: rol interno y perfil de agente vivo. Un
 * administrador con todos los permisos, sin perfil, recibía `SUPPORT_AGENT_PROFILE_REQUIRED` en
 * cada ruta. Lo que estas pruebas fijan no es el texto: es que los TRES motivos por los que esta
 * sección puede no enseñar nada se lean distinto. Confundirlos es lo que manda a alguien a buscar
 * el fallo en los datos o en la red cuando lo que falta es un alta que se hace en otra pantalla.
 */
function error(status: number, code: string, message: string) {
  return new AtlasApiError({
    status,
    code,
    message,
    requestId: "req-test-1",
  });
}

describe("AccesoASoporte", () => {
  it("ante la falta de perfil, dice qué falta y adónde ir a arreglarlo", () => {
    render(
      <AccesoASoporte
        error={error(
          403,
          "SUPPORT_AGENT_PROFILE_REQUIRED",
          "Este usuario interno no tiene perfil de agente de soporte habilitado.",
        )}
      />,
    );

    expect(
      screen.getByText("Tu usuario todavía no es agente de soporte"),
    ).toBeInTheDocument();
    const enlace = screen.getByRole("link", { name: /Soporte · Agentes/ });
    expect(enlace).toHaveAttribute("href", "/internal/support/agents");
  });

  /**
   * Un 403 por rol NO se arregla habilitando un perfil de agente, así que ofrecer ese enlace
   * mandaría a la persona a una pantalla que tampoco puede abrir.
   */
  it("ante un 403 por rol, no ofrece el alta de agente", () => {
    render(
      <AccesoASoporte
        error={error(
          403,
          "FORBIDDEN",
          "El usuario autenticado no tiene permiso para esta operación.",
        )}
      />,
    );

    expect(screen.getByText(/Tu rol no alcanza/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Soporte · Agentes/ }),
    ).toBeNull();
  });

  /** Reintentar un 403 no cambia nada: el botón sólo aparece cuando el fallo puede ser transitorio. */
  it("ofrece reintentar en un fallo de servidor y no en uno de permisos", () => {
    const { rerender } = render(
      <AccesoASoporte
        error={error(403, "FORBIDDEN", "Sin permiso.")}
        onRetry={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /Reintentar/ })).toBeNull();

    rerender(
      <AccesoASoporte
        error={error(500, "INTERNAL_ERROR", "Falló el servicio.")}
        onRetry={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Reintentar/ }),
    ).toBeInTheDocument();
  });

  it("un error que no es del API cae al mensaje genérico sin inventar una causa", () => {
    render(<AccesoASoporte error={new Error("Network down")} />);

    expect(
      screen.getByText("No se pudo cargar la información de soporte."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Tu usuario todavía no es agente de soporte"),
    ).toBeNull();
  });

  it("arrastra el Request ID para que soporte pueda buscar la traza", () => {
    render(
      <AccesoASoporte
        error={error(403, "SUPPORT_AGENT_PROFILE_REQUIRED", "Sin perfil.")}
      />,
    );

    expect(screen.getByText(/req-test-1/)).toBeInTheDocument();
  });
});
