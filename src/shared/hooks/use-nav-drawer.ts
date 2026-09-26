"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Comportamiento del cajón de navegación en móvil.
 *
 * Tres reglas que un cajón necesita para no estorbar, y que se olvidan una por una cuando cada
 * pantalla se las monta por su cuenta:
 *
 * - Se cierra al navegar. Abrirlo es el paso previo a elegir destino; dejarlo encima de la pantalla
 *   recién cargada obliga a cerrarlo a mano justo cuando ya cumplió su función.
 * - Se cierra con Escape, que es la salida que el teclado espera de cualquier capa superpuesta.
 * - Bloquea el desplazamiento del fondo con una CLASE y no con un estilo en línea: dos capas
 *   abiertas a la vez (cajón y diálogo) se pisarían el valor anterior al restaurarlo, y la página
 *   quedaría congelada al cerrar la segunda.
 * - Devuelve el foco a quien lo abrió. Sin esto, cerrar con Escape deja el foco en el `body` y el
 *   siguiente tabulador vuelve a empezar por el principio del documento: quien navega con teclado
 *   pierde el sitio cada vez que mira el menú.
 */
export function useNavDrawer(open: boolean, close: () => void) {
  const pathname = usePathname();
  const abridor = useRef<HTMLElement | null>(null);

  useEffect(() => {
    close();
    // `close` se omite a propósito: lo que debe disparar el cierre es la RUTA. Si la función
    // cambiara de identidad en un render, incluirla cerraría el cajón recién abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      // Sólo se devuelve el foco si sigue suelto: si al cerrar el usuario ya está escribiendo en
      // otro sitio, robárselo sería peor que no devolverlo.
      const suelto =
        document.activeElement === null ||
        document.activeElement === document.body;
      if (abridor.current && suelto) abridor.current.focus();
      abridor.current = null;
      return;
    }
    abridor.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("atlas-nav-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("atlas-nav-open");
    };
  }, [open, close]);
}
