"use client";

import { useMemo, useState } from "react";
import { useInternalRoles, useUpdateInternalUserRolesMutation } from "./hooks";
import type { InternalUserListItem } from "./types";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";

export function UserRolesForm({
  user,
}: Readonly<{ user: InternalUserListItem }>) {
  const roles = useInternalRoles({ page: 1, limit: 100 });
  const mutation = useUpdateInternalUserRolesMutation(user.id);
  const [selected, setSelected] = useState(() => new Set(user.roles));
  const effectivePermissions = useMemo(
    () =>
      Array.from(
        new Set(
          (roles.data?.items ?? [])
            .filter((role) => selected.has(role.code))
            .flatMap((role) => role.permissions),
        ),
      ).sort(),
    [roles.data?.items, selected],
  );

  function toggle(code: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Roles y permisos"
          description="Asigna roles al usuario. Los permisos efectivos se calculan desde los roles definidos por el backend."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {roles.isLoading ? <LoadingSkeleton rows={4} /> : null}
        {roles.error ? (
          <ErrorState
            description={
              isAtlasApiError(roles.error)
                ? roles.error.message
                : "No se pudieron cargar los roles."
            }
            onRetry={() => void roles.refetch()}
          />
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          {(roles.data?.items ?? []).map((role) => (
            <label
              key={role.id}
              className="flex gap-3 rounded-lg border border-atlas-border p-3"
            >
              <input
                type="checkbox"
                checked={selected.has(role.code)}
                onChange={() => toggle(role.code)}
              />
              <span>
                <strong className="block text-sm text-atlas-text">
                  {role.name}
                </strong>
                <span className="text-xs text-atlas-muted">
                  {role.description ?? role.code} · {role.permissions.length}{" "}
                  permisos
                </span>
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-atlas-muted">
          Permisos resultantes:{" "}
          {effectivePermissions.length
            ? effectivePermissions.join(", ")
            : "ninguno"}
        </p>
        {mutation.error ? (
          <ErrorState
            description={
              isAtlasApiError(mutation.error)
                ? mutation.error.message
                : "No se pudieron asignar los roles."
            }
          />
        ) : null}
        {mutation.isSuccess ? (
          <p className="text-sm font-medium text-emerald-700">
            Roles actualizados correctamente.
          </p>
        ) : null}
        <Button
          isLoading={mutation.isPending}
          loadingText="Guardando…"
          onClick={() => mutation.mutate(Array.from(selected))}
        >
          Guardar roles y permisos
        </Button>
      </CardContent>
    </Card>
  );
}
