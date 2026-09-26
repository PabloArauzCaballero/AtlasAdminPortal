"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { setCurrentScreen } from "./current-screen";

/**
 * Declara la pantalla abierta para que cada llamada al backend lleve su origen (`x-atlas-flow`).
 *
 * Va en el marco del portal interno, una sola vez: es el único sitio que conoce la ruta y por el
 * que pasan todas las pantallas. Sin esto, las 104 pantallas del catálogo no tienen forma de
 * pasar de «existe en el código» a «alguien la usó de verdad».
 *
 * No pinta nada y no bloquea: si el efecto no llega a correr, la cabecera simplemente no viaja y el
 * backend guarda un nulo, que es la verdad.
 */
export function ScreenTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    // La ruta CONCRETA: quién es aquí un segmento dinámico sólo se puede adivinar, y el backend lo
    // sabe sin adivinar porque tiene el catálogo de pantallas con sus plantillas.
    setCurrentScreen(pathname);
    return () => setCurrentScreen(null);
  }, [pathname]);

  return null;
}
