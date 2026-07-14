"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "./internal-shell/app-sidebar";
import { AppTopbar } from "./internal-shell/app-topbar";
import { ViewExplainer } from "./view-explainer";

export function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-atlas-bg text-atlas-text">
      <AppSidebar />
      <div className="lg:pl-[268px]">
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
