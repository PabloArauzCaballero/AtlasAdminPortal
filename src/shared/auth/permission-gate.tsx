"use client";

import { useAuth } from "./auth-context";
import { ForbiddenState } from "@/shared/components/ui/states";

export function PermissionGate({
  permissions,
  mode = "any",
  children,
  fallback,
}: Readonly<{
  permissions: string[];
  mode?: "any" | "all";
  children: React.ReactNode;
  fallback?: React.ReactNode;
}>) {
  const { permissions: userPermissions } = useAuth();
  const allowed =
    permissions.length === 0 ||
    (mode === "all"
      ? permissions.every((permission) => userPermissions.includes(permission))
      : permissions.some((permission) => userPermissions.includes(permission)));

  // `fallback === undefined` (no se pasó) es lo único que trae la tarjeta. Con
  // `??`, un `fallback={null}` explícito — la convención para esconder una
  // acción suelta — caía en el operando derecho y colaba la tarjeta entera.
  if (!allowed)
    return fallback === undefined ? <ForbiddenState /> : <>{fallback}</>;
  return <>{children}</>;
}
