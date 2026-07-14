import { Suspense } from "react";
import { AppProviders } from "@/shared/providers/app-providers";
import { InternalProtectedShell } from "@/shared/auth/internal-protected-shell";
import { RouteProgress } from "@/shared/components/layout/route-progress";

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
      <InternalProtectedShell>{children}</InternalProtectedShell>
    </AppProviders>
  );
}
