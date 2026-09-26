/**
 * Cámara del lienzo: desplazamiento y zoom. Pura y sin DOM para poder probar
 * lo único que se puede romper de verdad aquí — que el zoom con rueda mantenga
 * fijo el punto bajo el cursor y que la escala no se escape de sus topes.
 *
 * El lienzo es de SOLO LECTURA: se navega y se inspecciona, no se editan ni se
 * arrastran los nodos.
 */

export type Viewport = Readonly<{ x: number; y: number; scale: number }>;

export const MIN_SCALE = 0.2;
export const MAX_SCALE = 2;

export const INITIAL_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 };

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * Zoom anclado a un punto de la pantalla: el contenido que estaba bajo el
 * cursor sigue estando bajo el cursor después de escalar.
 */
export function zoomAt(
  viewport: Viewport,
  factor: number,
  point: { x: number; y: number },
): Viewport {
  const scale = clampScale(viewport.scale * factor);
  const ratio = scale / viewport.scale;
  return {
    scale,
    x: point.x - (point.x - viewport.x) * ratio,
    y: point.y - (point.y - viewport.y) * ratio,
  };
}

export function panBy(
  viewport: Viewport,
  delta: { x: number; y: number },
): Viewport {
  return { ...viewport, x: viewport.x + delta.x, y: viewport.y + delta.y };
}

/** Encaja el grafo completo en el área visible, con un margen. */
export function fitToView(
  content: { width: number; height: number },
  view: { width: number; height: number },
  padding = 24,
): Viewport {
  if (content.width <= 0 || content.height <= 0 || view.width <= 0) {
    return INITIAL_VIEWPORT;
  }
  const scale = clampScale(
    Math.min(
      (view.width - padding * 2) / content.width,
      (view.height - padding * 2) / content.height,
    ),
  );
  return {
    scale,
    x: (view.width - content.width * scale) / 2,
    y: padding,
  };
}

/**
 * Encuadre de apertura: ajusta al ALTO y arranca por la entrada del flujo.
 *
 * Un recorrido de 22 etapas es una banda ancha y baja; encajarlo entero dejaría
 * las tarjetas ilegibles (y media pantalla vacía). Es preferible abrir con los
 * nodos a tamaño de lectura y que el usuario recorra a lo ancho.
 */
export function fitHeight(
  content: { width: number; height: number },
  view: { width: number; height: number },
  padding = 24,
): Viewport {
  if (content.height <= 0 || view.height <= 0) return INITIAL_VIEWPORT;
  const scale = clampScale(
    Math.min(1, (view.height - padding * 2) / content.height),
  );
  return { scale, x: padding, y: padding };
}

/** Centra un nodo concreto sin cambiar el zoom (para «ir al paso»). */
export function centerOn(
  viewport: Viewport,
  target: { x: number; y: number; width: number; height: number },
  view: { width: number; height: number },
): Viewport {
  return {
    ...viewport,
    x: view.width / 2 - (target.x + target.width / 2) * viewport.scale,
    y: view.height / 2 - (target.y + target.height / 2) * viewport.scale,
  };
}

export function toTransform(viewport: Viewport): string {
  return `translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`;
}
