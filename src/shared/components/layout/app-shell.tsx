"use client";

import { usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { AmbientBackground } from "@/shared/ambient/AmbientBackground";
import { ambientVariantFor } from "@/shared/ambient/ambient-routes";
import { useNavDrawer } from "@/shared/hooks/use-nav-drawer";
import { AppSidebar } from "./internal-shell/app-sidebar";
import { AppTopbar } from "./internal-shell/app-topbar";
import { MobileBottomNav } from "./internal-shell/mobile-bottom-nav";
import { SectionTabs } from "./internal-shell/section-tabs";
import { ViewExplainer } from "./view-explainer";
import { AssistFab } from "@/features/assist/assist-fab";

export function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useNavDrawer(menuOpen, closeMenu);
  const ambiente = useMemo(() => ambientVariantFor(pathname), [pathname]);

  return (
    /*
     * El fondo ambiental envuelve al armazón entero y no a cada vista: se monta una sola vez por
     * sesión, así que navegar no lo reinicia y su deriva es continua. Va detrás de todo, sin
     * eventos de puntero y marcado `aria-hidden`; se apaga solo con la pestaña oculta, en equipos
     * de gama baja y con movimiento reducido.
     *
     * El estado del cajón vive AQUÍ y no dentro de la barra: la hamburguesa está en la cabecera y
     * el menú es su hermano, así que el único sitio donde ambos se ven es su padre común.
     *
     * La variante la decide la ruta (`ambient-routes`): la portada puede lucir el fondo, y una
     * pantalla de trabajo no —ahí el lienzo va limpio—.
     */
    <div className="atlas-viewport relative bg-atlas-bg text-atlas-text">
      <AmbientBackground variant={ambiente} />
      <AppSidebar open={menuOpen} onClose={closeMenu} />
      <div className="relative lg:pl-[268px]">
        <AppTopbar />
        {/* key={pathname} remonta el contenido en cada navegación para que toda
            vista entre con la misma transición de fade/slide. El relleno inferior deja sitio al
            botón del asistente: sin él tapaba la última acción de la página (la paginación). */}
        <main
          key={pathname}
          className="animate-fade-in px-3 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-5 sm:px-4 sm:pt-6 lg:px-6 lg:pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
        >
          <SectionTabs />
          <ViewExplainer />
          {children}
        </main>
      </div>
      {/* Barra inferior del móvil (`<lg`): «Más» abre el cajón, cuyo estado vive aquí. El relleno de
          `main` (8 rem) deja sitio a la barra (3,5 rem) y al botón del asistente que va sobre ella. */}
      <MobileBottomNav onMore={() => setMenuOpen(true)} moreOpen={menuOpen} />
      {/* Fuera del `main`: éste se remonta en cada navegación y la conversación se perdería. */}
      <AssistFab />
    </div>
  );
}
