"use client";

import { useAuth } from "./auth-context";
import { ForbiddenState } from "@/shared/components/ui/states";

export function RoleGate({
  roles,
  children,
  fallback,
}: Readonly<{
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}>) {
  const { hasAnyRole } = useAuth();
  // Ver PermissionGate: `fallback={null}` significa "no renderices nada", y con
  // `??` acababa mostrando la tarjeta de acceso restringido.
  if (!hasAnyRole(roles))
    return fallback === undefined ? <ForbiddenState /> : <>{fallback}</>;
  return <>{children}</>;
}
