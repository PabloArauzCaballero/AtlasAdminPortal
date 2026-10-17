"use client";

import { useEffect, useId } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { LogOut } from "lucide-react";
import { z } from "zod";
import { useRevokeInternalSessionsMutation } from "./hooks";
import type { InternalSessionItem } from "./types";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Field, Input } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";

/** El mismo mínimo que `revokeInternalSessionsSchema` del backend. */
export const revokeSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(8, "El motivo debe tener al menos 8 caracteres.")
    .max(500, "El motivo no puede pasar de 500 caracteres."),
});
type RevokeForm = z.infer<typeof revokeSchema>;

function explicarError(error: unknown): string {
  if (!isAtlasApiError(error)) return "No se pudieron cerrar las sesiones.";
  if (error.status === 403)
    return "No tienes permiso para cerrar las sesiones de esta persona. Las cuentas de administración sólo las puede cerrar SUPER_ADMIN.";
  if (error.status === 404)
    return "Esa persona ya no existe en tu organización.";
  return error.message;
}

/**
 * Cerrar TODAS las sesiones de una persona: sale en su siguiente petición, en todos sus equipos. No
 * cambia su estado ni su contraseña; si la cuenta está comprometida, después hay que suspenderla desde
 * su ficha, o volverá a entrar con la misma contraseña.
 */
export function RevokeSessionsDialog({
  session,
  onClose,
  onDone,
}: Readonly<{
  session: InternalSessionItem | null;
  onClose: () => void;
  onDone: (message: string) => void;
}>) {
  const titleId = useId();
  const mutation = useRevokeInternalSessionsMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RevokeForm>({
    resolver: zodResolver(revokeSchema),
    defaultValues: { reason: "" },
  });

  // El diálogo sigue montado entre aperturas: sin esto, el motivo y el error de la persona anterior
  // aparecerían al abrirlo para otra.
  const sessionId = session?.sessionId;
  useEffect(() => {
    reset({ reason: "" });
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (!session) return null;
  const persona = session.fullName || session.email || "esta persona";

  const onSubmit = handleSubmit((values) =>
    mutation.mutate(
      { internalUserId: session.internalUserId, reason: values.reason },
      {
        onSuccess: (result) => {
          onDone(
            result.revokedSessions === 1
              ? `Se cerró 1 sesión de ${persona}.`
              : `Se cerraron ${result.revokedSessions} sesiones de ${persona}.`,
          );
          onClose();
        },
      },
    ),
  );

  return (
    <DialogShell
      open
      labelledBy={titleId}
      onClose={mutation.isPending ? () => undefined : onClose}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="w-full max-w-md animate-scale-in rounded-xl border border-atlas-border bg-white p-5 shadow-card"
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <h2 id={titleId} className="text-base font-semibold text-atlas-text">
            Cerrar las sesiones de {persona}
          </h2>
          <p className="mt-1 text-sm text-atlas-muted">
            Sale de inmediato en todos sus equipos y tendrá que volver a entrar.
            No cambia su estado ni su contraseña: si la cuenta está
            comprometida, suspéndela además desde su ficha.
          </p>
        </div>
        <Field
          label="Motivo (obligatorio, mínimo 8 caracteres)"
          tooltip="Por qué se cierran sus sesiones; queda en la auditoría de usuarios internos."
          error={errors.reason?.message}
        >
          <Input
            placeholder="Ej: Reportó el portátil extraviado"
            {...register("reason")}
          />
        </Field>
        {mutation.error ? (
          <ErrorState
            description={explicarError(mutation.error)}
            requestId={
              isAtlasApiError(mutation.error)
                ? mutation.error.requestId
                : undefined
            }
          />
        ) : null}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="danger"
            isLoading={mutation.isPending}
            loadingText="Cerrando…"
            disabled={mutation.isPending}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Cerrar sesiones
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
