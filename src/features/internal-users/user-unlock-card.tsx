"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { LockKeyholeOpen } from "lucide-react";
import { z } from "zod";
import { useUnlockInternalUserMutation } from "./hooks";
import type { InternalUserLockState } from "./types";
import { isAtlasApiError } from "@/shared/api/errors";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Field, Input } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { formatDateTime } from "@/shared/lib/format";

/** El mismo mínimo que `unlockInternalUserSchema` del backend. */
export const unlockSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(8, "El motivo debe tener al menos 8 caracteres.")
    .max(500, "El motivo no puede pasar de 500 caracteres."),
});
type UnlockForm = z.infer<typeof unlockSchema>;

/**
 * Desbloquear una cuenta interna sin tocar la base (hallazgo B14).
 *
 * Sólo se pinta si el bloqueo está VIGENTE: el que ya venció se levanta solo en el siguiente login
 * correcto, y ofrecer el botón entonces acabaría en un 409. Tampoco toca el estado del usuario ni
 * su contraseña: si la persona no recuerda la contraseña, eso es «¿Olvidaste tu contraseña?».
 */
export function UserUnlockCard({
  internalUserId,
  lock,
}: Readonly<{ internalUserId: string; lock: InternalUserLockState }>) {
  const mutation = useUnlockInternalUserMutation(internalUserId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UnlockForm>({
    resolver: zodResolver(unlockSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values.reason));

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Cuenta bloqueada por intentos fallidos"
          description={`No puede entrar hasta ${formatDateTime(lock.lockedUntil)}. Desbloquear la deja entrar ya con su contraseña de siempre; no cambia su estado ni cierra sesiones.`}
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Field
            tooltip="Por qué se levanta el bloqueo; queda en la auditoría de usuarios internos."
            label="Motivo (obligatorio, mínimo 8 caracteres)"
            error={errors.reason?.message}
          >
            <Input
              placeholder="Ej: Confirmado por teléfono que fue ella quien se equivocó"
              {...register("reason")}
            />
          </Field>
          {mutation.error ? (
            <ErrorState
              description={
                isAtlasApiError(mutation.error) && mutation.error.status === 409
                  ? "La cuenta ya no estaba bloqueada: el bloqueo venció o alguien lo levantó antes."
                  : isAtlasApiError(mutation.error)
                    ? mutation.error.message
                    : "No se pudo desbloquear la cuenta."
              }
              requestId={
                isAtlasApiError(mutation.error)
                  ? mutation.error.requestId
                  : undefined
              }
            />
          ) : null}
          <Button
            type="submit"
            variant="primary"
            isLoading={mutation.isPending}
            loadingText="Desbloqueando…"
            disabled={mutation.isPending}
          >
            <LockKeyholeOpen className="h-4 w-4" aria-hidden />
            Desbloquear
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
