import { describe, expect, it } from "vitest";
import {
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

  it("coloca debajo centrado horizontalmente", () => {
    const target: Rect = { top: 100, left: 400, width: 200, height: 50 };
    const pos = placeTooltip(target, tooltip, viewport, "bottom");
    expect(pos.top).toBe(100 + 50 + 12);
    // centro del target (500) menos media tarjeta (150) = 350
    expect(pos.left).toBe(350);
  });
});
