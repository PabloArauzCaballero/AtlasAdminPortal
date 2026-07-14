"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreateInternalUserMutation, useInternalRoles } from "./hooks";
import type { CreateInternalUserInput, InternalUserDepartment } from "./types";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { isAtlasApiError } from "@/shared/api/errors";

const DEPARTMENTS: InternalUserDepartment[] = [
  "OPERATIONS",
  "RISK",
  "COLLECTIONS",
  "COMPLIANCE",
  "FINANCE",
  "SUPPORT",
  "SYSTEMS",
  "AUDIT",
  "EXECUTIVE",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function UserCreateForm() {
  const router = useRouter();
  const mutation = useCreateInternalUserMutation();
  const roles = useInternalRoles();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] =
    useState<InternalUserDepartment>("OPERATIONS");
  const [jobTitle, setJobTitle] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );

  function toggleRole(code: string) {
    setSelectedRoles((current) =>
      current.includes(code)
        ? current.filter((value) => value !== code)
        : [...current, code],
    );
  }

  function submit() {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setValidationError("Ingresa un correo institucional válido.");
      return;
    }
    if (fullName.trim().length < 3) {
      setValidationError("El nombre completo es obligatorio.");
      return;
    }
    if (selectedRoles.length === 0) {
      setValidationError("Selecciona al menos un rol para el nuevo usuario.");
      return;
    }
    if (reason.trim().length < 8) {
      setValidationError(
        "El motivo es obligatorio y debe tener al menos 8 caracteres.",
      );
      return;
    }
    setValidationError(null);
    const body: CreateInternalUserInput = {
      email: email.trim(),
      fullName: fullName.trim(),
      department,
      jobTitle: jobTitle.trim() || undefined,
      roles: selectedRoles,
      reason: reason.trim(),
    };
    mutation.mutate(body, {
      onSuccess: (result) => {
        setCreatedUserId(result.user.id);
        setTemporaryPassword(result.temporaryPassword);
      },
    });
  }

  if (createdUserId && temporaryPassword) {
    return (
      <TemporaryPasswordReveal
        temporaryPassword={temporaryPassword}
        onContinue={() =>
          router.push(`/internal/settings/users/${createdUserId}`)
        }
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Crear usuario interno"
          description="El admin no elige la contraseña: se genera una temporal al azar que se muestra una sola vez al confirmar el alta. La cuenta queda forzada a cambiarla en el primer login."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Correo institucional">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre.apellido@empresa.com"
            />
          </Field>
          <Field label="Nombre completo">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>
          <Field label="Cargo (opcional)">
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </Field>
          <Field label="Departamento">
            <Select
              value={department}
              onChange={(e) =>
                setDepartment(e.target.value as InternalUserDepartment)
              }
            >
              {DEPARTMENTS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field
          label="Roles"
          hint="Determina los permisos efectivos que tendrá la cuenta desde el primer login."
        >
          <div className="flex flex-wrap gap-2">
            {(roles.data?.items ?? []).map((role) => (
              <label
                key={role.id}
                className="flex items-center gap-2 rounded-lg border border-atlas-border px-3 py-1.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.code)}
                  onChange={() => toggleRole(role.code)}
                />
                {role.name}
              </label>
            ))}
            {roles.isLoading ? (
              <span className="text-xs text-atlas-muted">Cargando roles…</span>
            ) : null}
          </div>
        </Field>
        <Field
          label="Motivo (obligatorio, mínimo 8 caracteres)"
          hint="Se guarda en el registro de auditoría junto con el alta del usuario."
        >
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Alta solicitada por gerencia de Riesgo para nuevo analista"
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
                : "No se pudo crear el usuario."
            }
            requestId={
              isAtlasApiError(mutation.error)
                ? mutation.error.requestId
                : undefined
            }
          />
        ) : null}
        <Button
          variant="primary"
          isLoading={mutation.isPending}
          loadingText="Creando usuario…"
          onClick={submit}
        >
          Crear usuario
        </Button>
      </CardContent>
    </Card>
  );
}

function TemporaryPasswordReveal({
  temporaryPassword,
  onContinue,
}: Readonly<{ temporaryPassword: string; onContinue: () => void }>) {
  const [copied, setCopied] = useState(false);
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Usuario creado — contraseña temporal (solo se muestra una vez)"
          description="Compártela con la persona por un canal distinto a este portal (llamada, mensaje directo). Al iniciar sesión se le forzará cambiarla de inmediato; esta pantalla no vuelve a mostrarla."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-atlas-border bg-atlas-soft p-3 font-mono text-sm">
          <span className="flex-1 select-all break-all">
            {temporaryPassword}
          </span>
          <Button
            onClick={() => {
              void navigator.clipboard.writeText(temporaryPassword);
              setCopied(true);
            }}
          >
            {copied ? "Copiada" : "Copiar"}
          </Button>
        </div>
        <Button variant="primary" onClick={onContinue}>
          Listo, ir al detalle del usuario
        </Button>
      </CardContent>
    </Card>
  );
}
