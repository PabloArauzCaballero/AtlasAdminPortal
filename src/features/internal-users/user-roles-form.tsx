"use client";

import { useMemo, useState } from "react";
import { KeyRound, Lock, ShieldCheck, UserCheck } from "lucide-react";
import { useInternalRoles, useUpdateInternalUserRolesMutation } from "./hooks";
import type { InternalUserListItem } from "./types";
import { useAuth } from "@/shared/auth/auth-context";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { cn } from "@/shared/lib/cn";

export function UserRolesForm({
  user,
}: Readonly<{ user: InternalUserListItem }>) {
  const { user: sessionUser } = useAuth();
  const roles = useInternalRoles({ page: 1, limit: 100 });
  const mutation = useUpdateInternalUserRolesMutation(user.id);
  const [selected, setSelected] = useState(() => new Set(user.roles));

  /**
   * Nadie edita sus PROPIOS roles, y esto no es una política del portal: `replaceRoles` del
   * backend responde 403 «No puedes reemplazar tus propios roles internos desde este endpoint»
   * cuando el objetivo es el propio actor. La pantalla lo ignoraba —pintaba las casillas
   * activas y el botón habilitado— así que un administrador podía desmarcarse SUPER_ADMIN,
   * pulsar guardar y recibir un error rojo por una acción que jamás iba a poder realizar. Peor:
   * las casillas quedaban desmarcadas, dando a entender que se había quedado sin permisos.
   */
  const isSelf = Boolean(
    sessionUser && String(sessionUser.id) === String(user.id),
  );

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
    if (isSelf) return;
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
          description="Los permisos efectivos se calculan desde los roles definidos por el backend."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {isSelf ? <SelfEditNotice /> : null}
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
        <fieldset
          disabled={isSelf}
          className="grid gap-3 grid-cols-1 md:grid-cols-2"
          aria-describedby={isSelf ? "self-role-lock" : undefined}
        >
          {(roles.data?.items ?? []).map((role) => {
            const checked = selected.has(role.code);
            return (
              <label
                key={role.id}
                className={cn(
                  "flex gap-3 rounded-xl border p-3 transition-colors",
                  checked
                    ? "border-atlas-accent/40 bg-atlas-accentSoft"
                    : "border-atlas-border bg-white",
                  isSelf
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:border-slate-300",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={checked}
                  disabled={isSelf}
                  onChange={() => toggle(role.code)}
                />
                <span className="min-w-0">
                  <strong className="flex items-center gap-1.5 text-sm text-atlas-text">
                    <ShieldCheck
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        checked ? "text-atlas-accent" : "text-slate-500",
                      )}
                      aria-hidden
                    />
                    {role.name}
                  </strong>
                  <span className="mt-0.5 block truncate text-xs text-atlas-muted">
                    {role.description ?? role.code}
                  </span>
                  <Badge tone={checked ? "info" : "muted"} className="mt-1.5">
                    <KeyRound className="h-3 w-3" aria-hidden />
                    {role.permissions.length} permisos
                  </Badge>
                </span>
              </label>
            );
          })}
        </fieldset>
        <p className="flex items-start gap-1.5 text-xs text-atlas-muted">
          <UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Permisos resultantes:{" "}
            {effectivePermissions.length
              ? effectivePermissions.join(", ")
              : "ninguno"}
          </span>
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
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Roles actualizados correctamente.
          </p>
        ) : null}
        <Button
          variant="primary"
          disabled={isSelf}
          isLoading={mutation.isPending}
          loadingText="Guardando…"
          title={
            isSelf
              ? "Tus propios roles los cambia otro administrador."
              : undefined
          }
          onClick={() => mutation.mutate(Array.from(selected))}
        >
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Guardar roles y permisos
        </Button>
      </CardContent>
    </Card>
  );
}

function SelfEditNotice() {
  return (
    <p
      id="self-role-lock"
      role="status"
      className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <span>
        <strong className="block">Estás viendo tu propia cuenta.</strong>
        Nadie modifica sus propios roles: para cambiar los tuyos tiene que
        hacerlo otro administrador. Así una cuenta no puede escalar sus
        privilegios ni dejarse a sí misma sin acceso.
      </span>
    </p>
  );
}
