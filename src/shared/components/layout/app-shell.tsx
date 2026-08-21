"use client";

import { usePathname } from "next/navigation";
import { AmbientBackground } from "@/shared/ambient/AmbientBackground";
import { AppSidebar } from "./internal-shell/app-sidebar";
import { AppTopbar } from "./internal-shell/app-topbar";
import { ViewExplainer } from "./view-explainer";

export function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  return (
    /*
     * El fondo ambiental envuelve al armazón entero y no a cada vista: se monta una sola vez por
     * sesión, así que navegar no lo reinicia y su deriva es continua. Va detrás de todo, sin
     * eventos de puntero y marcado `aria-hidden`; se apaga solo con la pestaña oculta, en equipos
     * de gama baja y con movimiento reducido.
     */
    <div className="relative min-h-screen bg-atlas-bg text-atlas-text">
      <AmbientBackground variant="dashboard" />
      <AppSidebar />
      <div className="relative lg:pl-[268px]">
        <AppTopbar />
        {/* key={pathname} remonta el contenido en cada navegación para que toda
            vista entre con la misma transición de fade/slide. */}
        <main key={pathname} className="animate-fade-in px-4 py-6 lg:px-6">
          <ViewExplainer />
          {children}
        </main>
      </div>
    </div>
  );
}
