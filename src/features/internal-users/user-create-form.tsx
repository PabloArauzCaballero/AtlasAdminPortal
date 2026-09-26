"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
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
import { Field, Input } from "@/shared/components/ui/input";
import { FormSelect } from "@/shared/components/ui/form-select";
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
      <UsuarioCreadoAviso
        email={created.user.email}
        userId={created.user.id}
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
          description="El administrador no elige la contraseña: se genera una provisional al azar y se envía al correo de la persona. En su primer acceso deberá cambiarla y confirmar con un código de un solo uso que también le llega por correo."
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Field
              tooltip="Correo corporativo de la persona; con él entra y recibe el código."
              label="Correo institucional"
              error={errors.email?.message}
            >
              <Input
                type="email"
                placeholder="nombre.apellido@empresa.com"
                {...register("email")}
              />
            </Field>
            <Field
              tooltip="Nombre y apellidos de la persona tal como aparecerán en la auditoría."
              label="Nombre completo"
              error={errors.fullName?.message}
            >
              <Input {...register("fullName")} />
            </Field>
            <Field
              tooltip="Puesto de la persona en la empresa, p. ej. analista de riesgo."
              label="Cargo (opcional)"
              error={errors.jobTitle?.message}
            >
              <Input {...register("jobTitle")} />
            </Field>
            <Field
              tooltip="Área de la empresa a la que pertenece la cuenta."
              label="Departamento"
              error={errors.department?.message}
            >
              <FormSelect
                control={control}
                name="department"
                options={DEPARTMENTS.map((value) => ({ value, label: value }))}
              />
            </Field>
          </div>

          <Controller
            control={control}
            name="roles"
            render={({ field }) => (
              <Field
                tooltip="Roles que dan permisos a la cuenta desde el primer acceso."
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
            tooltip="Por qué se da de alta la cuenta; queda en la auditoría del alta."
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

/**
 * Aviso tras el alta. NO enseña la contraseña provisional, y no es una omisión.
 *
 * Hasta el 2026-09-17 esta pantalla la mostraba una vez, con botón de copiar, para que el
 * administrador la pasara «por otro canal». Eso dejaba la contraseña en la pantalla, en el
 * portapapeles y en la captura que alguien hiciera para no perderla. Atlas ya se la manda a la
 * persona por correo, así que aquí sólo se explica qué le va a llegar y qué hacer si no llega.
 *
 * `data-testid="temporary-password"` desapareció con ella: el E2E de mensajería genera ahora su
 * propia contraseña y da de alta al usuario por la misma llamada que hace este formulario.
 */
export function UsuarioCreadoAviso({
  email,
  userId,
  onContinue,
}: Readonly<{
  email: string;
  userId: string;
  onContinue: () => void;
}>) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Usuario creado"
          description={`La contraseña provisional se envió a ${email}. Este portal no la muestra: la persona la recibe por correo.`}
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="list-disc space-y-1 pl-5 text-sm text-atlas-text">
          <li>
            En su primer acceso deberá cambiarla por una contraseña propia.
          </li>
          <li>
            Al entrar recibirá un código de un solo uso por correo y tendrá que
            escribirlo: es el segundo factor de acceso, no un error.
          </li>
          <li>
            Si el correo no llega, revisa la dirección en{" "}
            <Link
              href={`/internal/settings/users/${userId}`}
              className="font-medium text-atlas-accent underline"
            >
              la ficha del usuario
            </Link>
            ; desde ahí se corrige la cuenta y se le exige un cambio de
            contraseña.
          </li>
        </ul>
        <Button variant="primary" onClick={onContinue}>
          Ir a la ficha del usuario
        </Button>
      </CardContent>
    </Card>
  );
}
