/**
 * Utilidades de posicionamiento del spotlight. La geometría es pura (sin DOM)
 * para poder testearla: dado el rectángulo del target y el tamaño del tooltip,
 * calcula dónde colocar el tooltip sin salirse de la pantalla.
 */
import type { TutorialStep } from "./types";

export type Rect = Readonly<{
  top: number;
  left: number;
  width: number;
  height: number;
}>;

export type Size = Readonly<{ width: number; height: number }>;

export type Placement = "top" | "right" | "bottom" | "left";

const GAP = 12;

export function selectorFor(tutorialId: string): string {
  return `[data-tutorial-id="${tutorialId}"]`;
}

/** Elige una colocación que quepa; cae a otras si la preferida se sale. */
export function resolvePlacement(
  target: Rect,
  tooltip: Size,
  viewport: Size,
  preferred: TutorialStep["position"] = "auto",
): Placement {
  const fits: Record<Placement, boolean> = {
    bottom:
      target.top + target.height + GAP + tooltip.height <= viewport.height,
    top: target.top - GAP - tooltip.height >= 0,
    right: target.left + target.width + GAP + tooltip.width <= viewport.width,
    left: target.left - GAP - tooltip.width >= 0,
  };
  const order: Placement[] =
    preferred && preferred !== "auto"
      ? [preferred, "bottom", "top", "right", "left"]
      : ["bottom", "top", "right", "left"];
  return order.find((p) => fits[p]) ?? "bottom";
}

/**
 * Recorta el rectángulo del elemento a la porción visible del viewport. Es la
 * pieza que faltaba: un elemento más alto/ancho que la pantalla (p. ej. una
 * lista larga) tenía su resaltado y su atenuado fuera de pantalla. Devuelve
 * `null` si el elemento no intersecta el viewport.
 */
export function clampRectToViewport(rect: Rect, viewport: Size): Rect | null {
  const top = Math.max(rect.top, 0);
  const left = Math.max(rect.left, 0);
  const right = Math.min(rect.left + rect.width, viewport.width);
  const bottom = Math.min(rect.top + rect.height, viewport.height);
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return null;
  return { top, left, width, height };
}

/** Coordenadas (top,left) del tooltip, ancladas al target y recortadas al viewport. */
export function placeTooltip(
  target: Rect,
  tooltip: Size,
  viewport: Size,
  placement: Placement,
): { top: number; left: number } {
  let top = 0;
  let left = 0;
  switch (placement) {
    case "bottom":
      top = target.top + target.height + GAP;
      left = target.left + target.width / 2 - tooltip.width / 2;
      break;
    case "top":
      top = target.top - tooltip.height - GAP;
      left = target.left + target.width / 2 - tooltip.width / 2;
      break;
    case "right":
      top = target.top + target.height / 2 - tooltip.height / 2;
      left = target.left + target.width + GAP;
      break;
    case "left":
      top = target.top + target.height / 2 - tooltip.height / 2;
      left = target.left - tooltip.width - GAP;
      break;
  }
  return {
    top: clamp(top, GAP, viewport.height - tooltip.height - GAP),
    left: clamp(left, GAP, viewport.width - tooltip.width - GAP),
  };
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(value, max));
}
