import { Suspense } from "react";
import { AppProviders } from "@/shared/providers/app-providers";
import { InternalProtectedShell } from "@/shared/auth/internal-protected-shell";
import { RouteProgress } from "@/shared/components/layout/route-progress";
import { ScreenTracker } from "@/shared/api/screen-tracker";
import { TutorialProvider } from "@/features/qa-tutorials/tutorial-provider";

// Portal interno autenticado: no se prerenderiza como contenido público.
// Reduce generación estática innecesaria en build y evita exponer rutas internas como SSG.
export const dynamic = "force-dynamic";

export default function InternalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppProviders>
      {/* RouteProgress reads useSearchParams, which suspends during SSR. Kept in
          its own boundary with a null fallback so it can never make the auth
          shell fall back to server-rendered HTML (that caused a hydration
          mismatch when the client re-rendered with the restored session). */}
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      {/* Declara la pantalla abierta para que cada llamada al backend lleve su origen. */}
      <ScreenTracker />
      {/* El TutorialProvider vive AQUÍ, por encima de AppShell, a propósito: el
          shell remonta su contenido en cada navegación (`<main key={pathname}>`)
          y cualquier provider por debajo perdería el recorrido activo al cambiar
          de página. Aquí sobrevive a la navegación; a un F5 lo salva el almacenamiento de sesión del navegador. */}
      <TutorialProvider>
        <InternalProtectedShell>{children}</InternalProtectedShell>
      </TutorialProvider>
    </AppProviders>
  );
}
