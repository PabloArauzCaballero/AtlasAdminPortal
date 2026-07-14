"use client";

import { useState } from "react";
import { useUpdateInternalUserMutation } from "./hooks";
import type { InternalUserListItem, UpdateInternalUserInput } from "./types";
import { useAuth } from "@/shared/auth/auth-context";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { isAtlasApiError } from "@/shared/api/errors";

const DEPARTMENTS = [
  "OPERATIONS",
  "RISK",
  "COLLECTIONS",
  "COMPLIANCE",
  "FINANCE",
  "SUPPORT",
  "SYSTEMS",
  "AUDIT",
  "EXECUTIVE",
] as const;

const STATUSES = [
  "active",
  "invited",
  "suspended",
  "locked",
  "disabled",
] as const;

export function UserEditForm({
  user,
}: Readonly<{ user: InternalUserListItem }>) {
  const mutation = useUpdateInternalUserMutation(user.id);
  const { user: currentUser } = useAuth();
  const isSelf = currentUser?.id === user.id;
  const [fullName, setFullName] = useState(user.fullName);
  const [department, setDepartment] = useState(user.department ?? "OPERATIONS");
  const [jobTitle, setJobTitle] = useState(user.jobTitle ?? "");
  const [status, setStatus] = useState(user.status);
  const [mustChangePassword, setMustChangePassword] = useState(
    Boolean(user.mustChangePassword),
  );
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const statusChanged = status !== user.status;
  const isDeactivating = statusChanged && status !== "active";

  function submit() {
    if (reason.trim().length < 8) {
      setValidationError(
        "El motivo es obligatorio y debe tener al menos 8 caracteres.",
      );
      return;
    }
    setValidationError(null);
    const body: UpdateInternalUserInput = {
      fullName: fullName !== user.fullName ? fullName : undefined,
      department:
        department !== user.department
          ? (department as UpdateInternalUserInput["department"])
          : undefined,
      jobTitle: jobTitle !== (user.jobTitle ?? "") ? jobTitle : undefined,
      status:
        status !== user.status
          ? (status as UpdateInternalUserInput["status"])
          : undefined,
      mustChangePassword:
        mustChangePassword !== Boolean(user.mustChangePassword)
          ? mustChangePassword
          : undefined,
      reason: reason.trim(),
    };
    mutation.mutate(body, { onSuccess: () => setReason("") });
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Editar / desactivar usuario"
          description="Toda modificación (perfil o estado) requiere un motivo auditable. Queda registrado en el log de acciones internas."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre completo">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>
          <Field label="Cargo">
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </Field>
          <Field label="Departamento">
            <Select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {DEPARTMENTS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Estado"
            hint={
              isSelf
                ? "No puedes suspender/bloquear tu propia cuenta."
                : statusChanged
                  ? "Cambiar el estado revoca tokens activos si deja de ser 'active'."
                  : undefined
            }
          >
            <Select
              value={status}
              disabled={isSelf}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mustChangePassword}
            onChange={(e) => setMustChangePassword(e.target.checked)}
          />
          Forzar cambio de contraseña en el próximo login
        </label>
        <Field
          label="Motivo (obligatorio, mínimo 8 caracteres)"
          hint="Se guarda en el registro de auditoría junto con los campos modificados."
        >
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Suspensión solicitada por seguridad tras incidente #1234"
          />
        </Field>
        {validationError ? (
          <ErrorState
            title="Formulario inválido"
            description={validationError}
          />
        ) : null}
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
          variant={isDeactivating ? "danger" : "primary"}
          isLoading={mutation.isPending}
          loadingText="Guardando…"
          onClick={submit}
        >
          {isDeactivating ? "Guardar y cambiar estado" : "Guardar cambios"}
        </Button>
      </CardContent>
    </Card>
  );
}
