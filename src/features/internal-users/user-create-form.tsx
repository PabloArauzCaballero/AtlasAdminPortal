"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useCreateInternalUserMutation, useInternalRoles } from "./hooks";
import {
  createUserSchema,
  DEPARTMENTS,
  type CreateUserForm,
} from "./user-create-schema";
import type { CreateInternalUserResult } from "./types";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { isAtlasApiError } from "@/shared/api/errors";

export function UserCreateForm() {
  const router = useRouter();
  const mutation = useCreateInternalUserMutation();
  const roles = useInternalRoles();
  const [created, setCreated] = useState<CreateInternalUserResult | null>(null);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      fullName: "",
      department: "OPERATIONS",
      jobTitle: "",
      roles: [],
      reason: "",
    },
  });

  // `handleSubmit` no llama a esto si el esquema no pasa: no quedan validaciones
  // sueltas en el componente ni forma de enviar un alta incompleta.
  const onSubmit = handleSubmit((values) => {
    mutation.mutate(
      { ...values, jobTitle: values.jobTitle?.trim() || undefined },
      { onSuccess: setCreated },
    );
  });

  if (created) {
    return (
      <TemporaryPasswordReveal
        temporaryPassword={created.temporaryPassword}
        warnings={created.warnings}
        onContinue={() =>
          router.push(`/internal/settings/users/${created.user.id}`)
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
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Correo institucional" error={errors.email?.message}>
              <Input
                type="email"
                placeholder="nombre.apellido@empresa.com"
                {...register("email")}
              />
            </Field>
            <Field label="Nombre completo" error={errors.fullName?.message}>
              <Input {...register("fullName")} />
            </Field>
            <Field label="Cargo (opcional)" error={errors.jobTitle?.message}>
              <Input {...register("jobTitle")} />
            </Field>
            <Field label="Departamento" error={errors.department?.message}>
              <Select {...register("department")}>
                {DEPARTMENTS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Controller
            control={control}
            name="roles"
            render={({ field }) => (
              <Field
                label="Roles"
                hint="Determina los permisos efectivos que tendrá la cuenta desde el primer login."
                error={errors.roles?.message}
              >
                <div className="flex flex-wrap gap-2">
                  {(roles.data?.items ?? []).map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center gap-2 rounded-lg border border-atlas-border px-3 py-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={field.value.includes(role.code)}
                        onChange={() =>
                          field.onChange(
                            field.value.includes(role.code)
                              ? field.value.filter((code) => code !== role.code)
                              : [...field.value, role.code],
                          )
                        }
                      />
                      {role.name}
                    </label>
                  ))}
                  {roles.isLoading ? (
                    <span className="text-xs text-atlas-muted">
                      Cargando roles…
                    </span>
                  ) : null}
                </div>
              </Field>
            )}
          />

          <Field
            label="Motivo (obligatorio, mínimo 8 caracteres)"
            hint="Se guarda en el registro de auditoría junto con el alta del usuario."
            error={errors.reason?.message}
          >
            <Input
              placeholder="Ej: Alta solicitada por gerencia de Riesgo para nuevo analista"
              {...register("reason")}
            />
          </Field>

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
            type="submit"
            variant="primary"
            isLoading={mutation.isPending}
            loadingText="Creando usuario…"
            disabled={mutation.isPending}
          >
            Crear usuario
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TemporaryPasswordReveal({
  temporaryPassword,
  warnings,
  onContinue,
}: Readonly<{
  temporaryPassword: string;
  warnings: string[];
  onContinue: () => void;
}>) {
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
        {warnings.length > 0 ? (
          <div
            role="alert"
            className="space-y-1 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-atlas-text"
          >
            <p className="font-semibold">
              El alta se completó a medias: revisa estos puntos
            </p>
            <ul className="list-disc space-y-1 pl-5 text-atlas-muted">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
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
