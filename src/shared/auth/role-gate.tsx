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
  if (!hasAnyRole(roles)) return fallback ?? <ForbiddenState />;
  return <>{children}</>;
}
