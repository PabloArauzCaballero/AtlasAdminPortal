import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ProviderHealthBadge,
  ProviderModeBadge,
  ProviderStatusBadge,
} from "@/features/external-providers-admin/provider-badges";

/**
 * El semáforo del catálogo de proveedores.
 *
 * La regresión que estas pruebas guardan no era un fallo de datos: `StatusBadge` cae en tono
 * neutro para todo literal que no esté en sus listas, y ni `UP`, ni `DOWN`, ni `DEGRADED` lo
 * estaban. La consecuencia es la peor que puede tener una tabla de salud: un proveedor CAÍDO se
 * pintaba exactamente igual que uno sano —mismo gris, mismo punto—, así que la vista afirmaba
 * que no pasaba nada mientras pasaba.
 *
 * Se comprueba el TONO, no sólo la etiqueta: traducir «DOWN» a «Caído» sin cambiar el color deja
 * el fallo intacto.
 */

function tonoDe(texto: string): string {
  const insignia = screen.getByText(texto).closest("span");
  return insignia?.className ?? "";
}

describe("ProviderHealthBadge", () => {
  it("un proveedor caído no se pinta como uno sano", () => {
    const { unmount } = render(<ProviderHealthBadge value="UP" />);
    const sano = tonoDe("Responde");
    expect(sano).toContain("emerald");
    unmount();

    render(<ProviderHealthBadge value="DOWN" />);
    const caido = tonoDe("Caído");
    expect(caido).toContain("red");
    expect(caido).not.toBe(sano);
  });

  it("degradado avisa en ámbar, ni verde ni rojo", () => {
    render(<ProviderHealthBadge value="DEGRADED" />);
    const tono = tonoDe("Degradado");
    expect(tono).toContain("amber");
    expect(tono).not.toContain("emerald");
  });

  it("sin medir es gris: nadie lo ha comprobado, no es que esté sano", () => {
    render(<ProviderHealthBadge value="UNKNOWN" />);
    expect(tonoDe("Sin medir")).not.toContain("emerald");
  });

  it("un estado que el portal no conoce se enseña tal cual, sin inventarle color", () => {
    render(<ProviderHealthBadge value="FLAPPING" />);
    const tono = tonoDe("FLAPPING");
    expect(tono).not.toContain("emerald");
    expect(tono).not.toContain("red");
  });
});

describe("ProviderStatusBadge y ProviderModeBadge", () => {
  it("los estados «sólo ...» dejan de caer en el gris de lo desconocido", () => {
    const { unmount } = render(<ProviderStatusBadge value="SANDBOX_ONLY" />);
    expect(screen.getByText("Sólo sandbox")).toBeInTheDocument();
    unmount();

    render(<ProviderStatusBadge value="MOCK_ONLY" />);
    expect(screen.getByText("Sólo simulado")).toBeInTheDocument();
  });

  it("sólo «production» se pinta en verde: el resto son simuladores", () => {
    const { unmount } = render(<ProviderModeBadge value="production" />);
    expect(tonoDe("Producción")).toContain("emerald");
    unmount();

    render(<ProviderModeBadge value="mock_server" />);
    expect(tonoDe("Simulado servidor")).not.toContain("emerald");
  });
});
