"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

/** El montaje no cambia nunca después de la hidratación: no hay a qué suscribirse. */
function suscribirNada(): () => void {
  return () => {};
}

/**
 * Monta a sus hijos en `document.body`.
 *
 * Existe por el mismo motivo que lo hace `DialogShell`: `AppShell` envuelve cada vista en un
 * `<main class="animate-fade-in">`, y una animación de opacidad con `fill-mode: both` deja a ese
 * `main` con contexto de apilamiento PROPIO aunque ya haya terminado. Cualquier cosa que quiera
 * pintarse por encima de las barras del portal —fijas y en la raíz— tiene que salir de ahí; subir
 * el `z-index` no sirve, el contexto padre lo acota igual.
 *
 * `useSyncExternalStore` evita el desajuste de hidratación: el servidor y la primera pasada del
 * cliente coinciden en «sin montar», y el portal aparece en la siguiente.
 */
export function Portal({ children }: Readonly<{ children: React.ReactNode }>) {
  const montado = useSyncExternalStore(
    suscribirNada,
    () => true,
    () => false,
  );
  if (!montado) return null;
  return createPortal(children, document.body);
}
