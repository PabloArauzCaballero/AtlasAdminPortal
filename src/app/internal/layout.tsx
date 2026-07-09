import { Suspense } from "react";
import { AppProviders } from "@/shared/providers/app-providers";
import { InternalProtectedShell } from "@/shared/auth/internal-protected-shell";
import { FullPageLoader } from "@/shared/components/ui/states";

// Portal interno autenticado: no se prerenderiza como contenido público.
// Reduce generación estática innecesaria en build y evita exponer rutas internas como SSG.
export const dynamic = "force-dynamic";

export default function InternalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppProviders>
      <Suspense fallback={<FullPageLoader />}>
        <InternalProtectedShell>{children}</InternalProtectedShell>
      </Suspense>
    </AppProviders>
  );
}
