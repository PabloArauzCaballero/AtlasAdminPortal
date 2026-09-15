import { describe, expect, it } from "vitest";
import {
  clampRectToViewport,
  matchesLocation,
  placeTooltip,
  resolvePlacement,
  selectorFor,
  type Rect,
} from "@/features/qa-tutorials/dom-utils";

const viewport = { width: 1000, height: 800 };
const tooltip = { width: 300, height: 200 };

describe("dom-utils · posicionamiento", () => {
  it("selectorFor construye el selector estable", () => {
    expect(selectorFor("run-test")).toBe('[data-tutorial-id="run-test"]');
  });

  it("prefiere la colocación pedida cuando cabe", () => {
    const target: Rect = { top: 300, left: 300, width: 100, height: 40 };
    expect(resolvePlacement(target, tooltip, viewport, "right")).toBe("right");
  });

  it("cae a otra colocación cuando la preferida no cabe", () => {
    // Target pegado al borde inferior: abajo no cabe, debe caer a arriba.
    const target: Rect = { top: 780, left: 300, width: 100, height: 40 };
    const placement = resolvePlacement(target, tooltip, viewport, "bottom");
    expect(placement).not.toBe("bottom");
  });

  it("placeTooltip recorta las coordenadas al viewport", () => {
    const target: Rect = { top: 10, left: 970, width: 20, height: 20 };
    const pos = placeTooltip(target, tooltip, viewport, "right");
    expect(pos.left).toBeLessThanOrEqual(viewport.width - tooltip.width);
    expect(pos.top).toBeGreaterThanOrEqual(0);
  });

  it("clampRectToViewport recorta un elemento más grande que la pantalla", () => {
    // Lista más alta que el viewport, empezando por encima del borde superior.
    const tall: Rect = { top: -400, left: 300, width: 700, height: 2000 };
    const clamped = clampRectToViewport(tall, viewport);
    expect(clamped).not.toBeNull();
    expect(clamped!.top).toBe(0);
    expect(clamped!.height).toBe(viewport.height);
    expect(clamped!.left).toBe(300);
    // El ancho se recorta al borde derecho del viewport (300 + 700 = 1000).
    expect(clamped!.left + clamped!.width).toBeLessThanOrEqual(viewport.width);
  });

  it("clampRectToViewport devuelve null si el elemento no intersecta", () => {
    const offscreen: Rect = { top: 2000, left: 0, width: 100, height: 50 };
    expect(clampRectToViewport(offscreen, viewport)).toBeNull();
  });

  it("clampRectToViewport deja intacto un elemento ya visible", () => {
    const inside: Rect = { top: 100, left: 100, width: 200, height: 80 };
    expect(clampRectToViewport(inside, viewport)).toEqual(inside);
  });

  it("coloca debajo centrado horizontalmente", () => {
    const target: Rect = { top: 100, left: 400, width: 200, height: 50 };
    const pos = placeTooltip(target, tooltip, viewport, "bottom");
    expect(pos.top).toBe(100 + 50 + 12);
    // centro del target (500) menos media tarjeta (150) = 350
    expect(pos.left).toBe(350);
  });

  it("si el elemento llena la pantalla, la tarjeta va a la esquina inferior izquierda", () => {
    const huge: Rect = { top: 0, left: 0, width: 1000, height: 800 };
    const placement = resolvePlacement(huge, tooltip, viewport, "auto");
    expect(placement).toBe("corner");
    const pos = placeTooltip(huge, tooltip, viewport, placement);
    expect(pos.left).toBe(12);
    expect(pos.top).toBe(viewport.height - tooltip.height - 12);
  });

  it("matchesLocation compara ruta exacta y los parámetros pedidos", () => {
    const here = {
      pathname: "/internal/qa/lab",
      search: "?tab=unitaria&sub=carga",
    };
    expect(matchesLocation(here, "/internal/qa/lab")).toBe(true);
    expect(matchesLocation(here, "/internal/qa/lab?tab=unitaria")).toBe(true);
    expect(matchesLocation(here, "/internal/qa/lab?tab=journey")).toBe(false);
    expect(
      matchesLocation(here, "/internal/qa/lab?sub=carga&tab=unitaria"),
    ).toBe(true);
    expect(matchesLocation(here, "/internal/qa/suites")).toBe(false);
    expect(
      matchesLocation(
        { pathname: "/internal/qa/lab/", search: "" },
        "/internal/qa/lab",
      ),
    ).toBe(true);
  });
});
