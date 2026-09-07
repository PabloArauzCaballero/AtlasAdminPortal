import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmbientBackground } from "@/shared/ambient/AmbientBackground";

/**
 * El fondo se dibuja dentro de un host `position: absolute` que cubre el ARMAZÓN
 * entero, así que su caja es la del documento: en una página desplazada su borde
 * superior es negativo. Las coordenadas del puntero, en cambio, son de viewport.
 * Estas pruebas fijan la traducción entre ambos marcos: es lo que hacía que la
 * onda del clic apareciera desplazada tanto como llevara desplazada la página.
 */

const HOST_BOX = {
  // Página desplazada 800 px: el host empieza 800 px por encima de la ventana.
  top: -800,
  left: 0,
  width: 1000,
  height: 4000,
} as const;

function renderAmbient() {
  const view = render(<AmbientBackground />);
  const host = view.container.querySelector<HTMLElement>(".ambient-bg");
  if (!host) throw new Error("no se montó el fondo ambiental");
  host.getBoundingClientRect = () =>
    ({
      ...HOST_BOX,
      right: HOST_BOX.left + HOST_BOX.width,
      bottom: HOST_BOX.top + HOST_BOX.height,
      x: HOST_BOX.left,
      y: HOST_BOX.top,
      toJSON: () => HOST_BOX,
    }) as DOMRect;
  return host;
}

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(pointer: fine)",
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }));
  Object.defineProperty(window.navigator, "hardwareConcurrency", {
    configurable: true,
    value: 8,
  });
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1000,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 800,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AmbientBackground", () => {
  it("dibuja la onda del clic en el punto pulsado, no desplazada por el scroll", () => {
    const host = renderAmbient();

    window.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 400, clientY: 500 }),
    );

    const ripple = host.querySelector<HTMLElement>(".ambient-ripple");
    expect(ripple).not.toBeNull();
    // clientY 500 en una página desplazada 800 px cae a 1300 px dentro del host.
    expect(ripple?.style.left).toBe("400px");
    expect(ripple?.style.top).toBe("1300px");
  });

  it("publica la posición absoluta contra el host y el desvío contra la ventana", () => {
    const host = renderAmbient();

    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 250, clientY: 400 }),
    );

    // Absoluta: fracción de la caja del host (250/1000, 1200/4000).
    expect(host.style.getPropertyValue("--ambient-px")).toBe("0.2500");
    expect(host.style.getPropertyValue("--ambient-py")).toBe("0.3000");
    // Desvío para el paralaje: sigue midiéndose desde el centro de la VENTANA,
    // o en una página larga quedaría clavado y las capas dejarían de separarse.
    expect(host.style.getPropertyValue("--ambient-x")).toBe("-0.2500");
    expect(host.style.getPropertyValue("--ambient-y")).toBe("0.0000");
  });
});
