"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AmbientBackground } from "@/shared/ambient/AmbientBackground";
import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  confirmPasswordReset,
  requestPasswordReset,
} from "@/shared/auth/auth-service";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Field, Input } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";

/**
 * Recuperar el acceso al portal interno.
 *
 * Hasta ahora, quien olvidaba su contraseña no tenía salida por su cuenta: lo único que existía
 * era el cambio DESDE DENTRO, que pide la contraseña actual, y hacía falta que alguien de Sistemas
 * fabricara una a mano. Dos pasos: llega un código de 6 dígitos al correo de la cuenta y ese
 * código, con la contraseña nueva, completa el cambio.
 *
 * **Esto no debilita el segundo factor.** Tras recuperar la contraseña, entrar sigue pidiendo el
 * PIN que AtlasBackend manda al correo: quien sólo tenga la contraseña nueva no entra.
 */
const pedirSchema = z.object({
  tenantId: z.string().trim().min(1, "El tenant es obligatorio."),
  email: z.string().trim().email("Ingresa un correo válido."),
});

const confirmarSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "El código tiene 6 dígitos."),
  newPassword: z
    .string()
    .min(10, "La contraseña debe tener al menos 10 caracteres."),
});

type PedirForm = z.infer<typeof pedirSchema>;
type ConfirmarForm = z.infer<typeof confirmarSchema>;
type Paso = "pedir" | "confirmar" | "listo";

export function RecoverAccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paso, setPaso] = useState<Paso>("pedir");
  // El correo y el tenant confirmados en el paso 1 son los que viajan en el paso 2: si se leyeran
  // otra vez de un campo editable, el código pedido para una cuenta podría canjearse escribiendo
  // otra por error y el fallo se leería como «código inválido».
  const [cuenta, setCuenta] = useState<{
    tenantId: string;
    email: string;
  } | null>(null);

  const pedir = useForm<PedirForm>({
    resolver: zodResolver(pedirSchema),
    defaultValues: {
      tenantId: process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? "1",
      email: searchParams.get("correo") ?? "",
    },
  });

  const confirmar = useForm<ConfirmarForm>({
    resolver: zodResolver(confirmarSchema),
    defaultValues: { code: "", newPassword: "" },
  });

  const onPedir = pedir.handleSubmit(async (values) => {
    try {
      await requestPasswordReset(values);
      // Se avanza SIEMPRE, exista o no la cuenta: quedarse aquí con un «ese correo no existe»
      // convertiría la pantalla en un comprobador de quién tiene cuenta interna.
      setCuenta({ tenantId: values.tenantId, email: values.email });
      setPaso("confirmar");
    } catch (error) {
      pedir.setError("root", {
        message: isAtlasApiError(error)
          ? error.message
          : "No se pudo enviar el código. Inténtalo otra vez.",
      });
    }
  });

  const onConfirmar = confirmar.handleSubmit(async (values) => {
    if (!cuenta) return;
    try {
      await confirmPasswordReset({ ...cuenta, ...values });
      setPaso("listo");
    } catch (error) {
      confirmar.setError("root", {
        message: isAtlasApiError(error)
          ? error.message
          : "No se pudo cambiar la contraseña.",
      });
    }
  });

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4">
      <AmbientBackground />
      <div className="relative w-full max-w-md animate-fade-in rounded-2xl border border-atlas-border bg-white/90 p-6 shadow-card backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-[#006a61] to-slate-900 text-white">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.02em] text-atlas-accent">
              Acceso interno ATLAS
            </p>
            <h1 className="text-lg font-semibold text-atlas-text">
              {paso === "listo" ? "Ya puedes entrar" : "Recuperar el acceso"}
            </h1>
          </div>
        </div>

        {paso === "pedir" ? (
          <>
            <p className="mb-4 text-sm leading-6 text-atlas-muted">
              Escribe tu correo interno y te enviamos un código de 6 dígitos
              para poner una contraseña nueva.
            </p>
            {pedir.formState.errors.root?.message ? (
              <div className="mb-4">
                <ErrorState
                  title="No se pudo enviar el código"
                  description={pedir.formState.errors.root.message}
                />
              </div>
            ) : null}
            <form className="space-y-4" onSubmit={(e) => void onPedir(e)}>
              <Field
                tooltip="Identificador de la organización a la que pertenece tu cuenta interna."
                label="Tenant"
                error={pedir.formState.errors.tenantId?.message}
              >
                <Input
                  {...pedir.register("tenantId")}
                  autoComplete="organization"
                />
              </Field>
              <Field
                tooltip="Correo con el que se dio de alta tu cuenta interna de Atlas."
                label="Correo interno"
                error={pedir.formState.errors.email?.message}
              >
                <Input
                  {...pedir.register("email")}
                  type="email"
                  autoComplete="email"
                />
              </Field>
              <Button
                className="w-full"
                variant="primary"
                type="submit"
                disabled={pedir.formState.isSubmitting}
              >
                {pedir.formState.isSubmitting
                  ? "Enviando…"
                  : "Enviarme el código"}
              </Button>
            </form>
          </>
        ) : null}

        {paso === "confirmar" ? (
          <>
            <p className="mb-4 text-sm leading-6 text-atlas-muted">
              Si <strong>{cuenta?.email}</strong> corresponde a una cuenta
              interna, ahí llegó un código de 6 dígitos. Sólo sirve una vez y
              caduca en pocos minutos.
            </p>
            {confirmar.formState.errors.root?.message ? (
              <div className="mb-4">
                <ErrorState
                  title="No se pudo cambiar la contraseña"
                  description={confirmar.formState.errors.root.message}
                />
              </div>
            ) : null}
            <form className="space-y-4" onSubmit={(e) => void onConfirmar(e)}>
              <Field
                tooltip="Código de seis dígitos que te llegó al correo; caduca en pocos minutos."
                label="Código del correo"
                error={confirmar.formState.errors.code?.message}
              >
                <Input
                  {...confirmar.register("code")}
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </Field>
              <Field
                tooltip="Tu contraseña nueva del portal interno; distingue mayúsculas."
                label="Contraseña nueva"
                error={confirmar.formState.errors.newPassword?.message}
                hint="Al menos 10 caracteres. Nadie de soporte te la pedirá."
              >
                <Input
                  {...confirmar.register("newPassword")}
                  type="password"
                  autoComplete="new-password"
                />
              </Field>
              <Button
                className="w-full"
                variant="primary"
                type="submit"
                disabled={confirmar.formState.isSubmitting}
              >
                {confirmar.formState.isSubmitting
                  ? "Guardando…"
                  : "Cambiar mi contraseña"}
              </Button>
              <button
                type="button"
                className="w-full text-xs font-semibold text-atlas-muted transition hover:text-atlas-text"
                onClick={() => {
                  confirmar.reset();
                  setPaso("pedir");
                }}
              >
                No me llegó: pedir otro código
              </button>
            </form>
          </>
        ) : null}

        {paso === "listo" ? (
          <>
            <p className="mb-4 text-sm leading-6 text-atlas-muted">
              Tu contraseña quedó cambiada y se cerraron las sesiones que tenías
              abiertas. Al entrar te pediremos, como siempre, el código de
              verificación del correo.
            </p>
            <Button
              className="w-full"
              variant="primary"
              onClick={() => router.replace("/internal/login")}
            >
              Ir al acceso
            </Button>
          </>
        ) : null}

        <p className="mt-6 border-t border-atlas-border pt-4 text-xs leading-5 text-atlas-muted">
          ¿Ya la recordaste?{" "}
          <Link
            href="/internal/login"
            className="font-semibold text-atlas-accent hover:underline"
          >
            Volver al acceso
          </Link>
        </p>
      </div>
    </main>
  );
}
