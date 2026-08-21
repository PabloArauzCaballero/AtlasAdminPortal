"use client";

import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { AmbientBackground } from "@/shared/ambient/AmbientBackground";
import { useNavDrawer } from "@/shared/hooks/use-nav-drawer";
import { AppSidebar } from "./internal-shell/app-sidebar";
import { AppTopbar } from "./internal-shell/app-topbar";
import { ViewExplainer } from "./view-explainer";

export function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useNavDrawer(menuOpen, closeMenu);

  return (
    /*
     * El fondo ambiental envuelve al armazón entero y no a cada vista: se monta una sola vez por
     * sesión, así que navegar no lo reinicia y su deriva es continua. Va detrás de todo, sin
     * eventos de puntero y marcado `aria-hidden`; se apaga solo con la pestaña oculta, en equipos
     * de gama baja y con movimiento reducido.
     *
     * El estado del cajón vive AQUÍ y no dentro de la barra: la hamburguesa está en la cabecera y
     * el menú es su hermano, así que el único sitio donde ambos se ven es su padre común.
     */
    <div className="atlas-viewport relative bg-atlas-bg text-atlas-text">
      <AmbientBackground variant="dashboard" />
      <AppSidebar open={menuOpen} onClose={closeMenu} />
      <div className="relative lg:pl-[268px]">
        <AppTopbar onMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />
        {/* key={pathname} remonta el contenido en cada navegación para que toda
            vista entre con la misma transición de fade/slide. */}
        <main
          key={pathname}
          className="animate-fade-in px-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-5 sm:px-4 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pt-6 lg:px-6"
        >
          <ViewExplainer />
          {children}
        </main>
      </div>
    </div>
  );
}
