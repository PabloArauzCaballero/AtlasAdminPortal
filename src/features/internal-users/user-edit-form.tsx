"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useUpdateInternalUserMutation } from "./hooks";
import type { InternalUserListItem } from "./types";
import {
  buildUpdatePayload,
  editUserDefaults,
  editUserSchema,
  EDIT_DEPARTMENTS,
  EDIT_STATUSES,
  type EditUserForm,
} from "./user-edit-schema";
import { useAuth } from "@/shared/auth/auth-context";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { isAtlasApiError } from "@/shared/api/errors";

export function UserEditForm({
  user,
}: Readonly<{ user: InternalUserListItem }>) {
  const mutation = useUpdateInternalUserMutation(user.id);
  const { user: currentUser } = useAuth();
  const isSelf = currentUser?.id === user.id;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: editUserDefaults(user),
  });

  const status = watch("status");
  const statusChanged = status !== user.status;
  const isDeactivating = statusChanged && status !== "active";

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(buildUpdatePayload(values, user), {
      // Se limpia solo el motivo: el resto queda como quedó tras guardar.
      onSuccess: () => reset({ ...values, reason: "" }),
    });
  });

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Editar / desactivar usuario"
          description="Toda modificación (perfil o estado) requiere un motivo auditable. Queda registrado en el log de acciones internas."
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre completo" error={errors.fullName?.message}>
              <Input {...register("fullName")} />
            </Field>
            <Field label="Cargo" error={errors.jobTitle?.message}>
              <Input {...register("jobTitle")} />
            </Field>
            <Field label="Departamento" error={errors.department?.message}>
              <Select {...register("department")}>
                {EDIT_DEPARTMENTS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Estado"
              error={errors.status?.message}
              hint={
                isSelf
                  ? "No puedes suspender/bloquear tu propia cuenta."
                  : statusChanged
                    ? "Cambiar el estado revoca tokens activos si deja de ser 'active'."
                    : undefined
              }
            >
              <Select {...register("status")} disabled={isSelf}>
                {EDIT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("mustChangePassword")} />
            Forzar cambio de contraseña en el próximo login
          </label>
          <Field
            label="Motivo (obligatorio, mínimo 8 caracteres)"
            error={errors.reason?.message}
            hint="Se guarda en el registro de auditoría junto con los campos modificados."
          >
            <Input
              placeholder="Ej: Suspensión solicitada por seguridad tras incidente #1234"
              {...register("reason")}
            />
          </Field>
          {mutation.error ? (
            <ErrorState
              description={
                isAtlasApiError(mutation.error)
                  ? mutation.error.message
                  : "No se pudo actualizar el usuario."
              }
              requestId={
                isAtlasApiError(mutation.error)
                  ? mutation.error.requestId
                  : undefined
              }
            />
          ) : null}
          {mutation.isSuccess ? (
            <p className="text-sm font-medium text-emerald-700">
              Cambios guardados correctamente.
            </p>
          ) : null}
          <Button
            type="submit"
            variant={isDeactivating ? "danger" : "primary"}
            isLoading={mutation.isPending}
            loadingText="Guardando…"
            disabled={mutation.isPending}
          >
            {isDeactivating ? "Guardar y cambiar estado" : "Guardar cambios"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
