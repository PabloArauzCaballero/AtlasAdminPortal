"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { isAtlasApiError } from "@/shared/api/errors";
import { useAuth } from "@/shared/auth/auth-context";
import {
  confirmPasswordChange,
  requestPasswordChange,
} from "@/shared/auth/auth-service";
import type { PinChallenge } from "@/shared/auth/types";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Field, Input } from "@/shared/components/ui/input";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { ErrorState } from "@/shared/components/ui/states";

const requestSchema = z.object({
  currentPassword: z.string().min(1, "Escribe tu contraseña actual."),
});

const confirmSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "El código son 6 dígitos."),
    newPassword: z
      .string()
      .min(10, "La contraseña debe tener al menos 10 caracteres.")
      .regex(/[a-zA-Z]/, "Debe incluir al menos una letra.")
      .regex(/[0-9\W]/, "Debe incluir al menos un número o símbolo."),
    repeatPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.repeatPassword, {
    path: ["repeatPassword"],
    message: "Las contraseñas no coinciden.",
  });

type RequestForm = z.infer<typeof requestSchema>;
type ConfirmForm = z.infer<typeof confirmSchema>;

/**
 * Cambio de contraseña en dos pasos, con el mismo segundo factor por correo que el acceso.
 *
 * Las reglas de la contraseña nueva se repiten aquí a propósito, aunque el backend las imponga: es
 * la diferencia entre corregir el campo mientras se escribe y descubrir el requisito después de
 * haber gastado el código de un solo uso, con el minuto de espera por delante para pedir otro.
 *
 * Al confirmar, ATLAS revoca TODAS las sesiones de la cuenta —incluida ésta—, así que la pantalla
 * cierra sesión de inmediato en vez de dejar al portal haciendo llamadas que ya devuelven 401.
 */
export function PasswordChangeCard() {
  const { logout } = useAuth();
  const [challenge, setChallenge] = useState<PinChallenge | null>(null);
  const [done, setDone] = useState(false);

  const requestForm = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { currentPassword: "" },
  });

  const confirmForm = useForm<ConfirmForm>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { code: "", newPassword: "", repeatPassword: "" },
  });

  const onRequest = requestForm.handleSubmit(async (values) => {
    try {
      setChallenge(await requestPasswordChange(values.currentPassword));
    } catch (error) {
      requestForm.setError("root", { message: describe(error) });
    }
  });

  const onConfirm = confirmForm.handleSubmit(async (values) => {
    if (!challenge) return;
    try {
      await confirmPasswordChange({
        challengeToken: challenge.challengeToken,
        code: values.code,
        newPassword: values.newPassword,
      });
      setDone(true);
      await logout();
    } catch (error) {
      confirmForm.setError("root", { message: describe(error) });
    }
  });

  return (
    <Card>
      <CardContent>
        <SectionHeader
          title="Cambiar contraseña"
          description="Pide un código a tu correo y confírmalo. Al terminar se cierran todas tus sesiones."
        />

        {done ? (
          <p className="text-sm text-atlas-muted">
            Contraseña cambiada. Cerramos tu sesión: vuelve a entrar con la
            contraseña nueva.
          </p>
        ) : challenge ? (
          <>
            <p className="mb-4 text-sm text-atlas-muted">
              Enviamos un código de 6 dígitos a tu correo. Vence en{" "}
              {challenge.expiresInMinutes} minutos.
            </p>
            {confirmForm.formState.errors.root?.message ? (
              <div className="mb-4">
                <ErrorState
                  title="No se pudo cambiar la contraseña"
                  description={confirmForm.formState.errors.root.message}
                />
              </div>
            ) : null}
            <form
              className="space-y-4"
              onSubmit={(event) => void onConfirm(event)}
            >
              <Field
                label="Código del correo"
                error={confirmForm.formState.errors.code?.message}
              >
                <Input
                  {...confirmForm.register("code")}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                />
              </Field>
              <Field
                label="Contraseña nueva"
                error={confirmForm.formState.errors.newPassword?.message}
                hint="Mínimo 10 caracteres, con al menos una letra y un número o símbolo."
              >
                <Input
                  {...confirmForm.register("newPassword")}
                  type="password"
                  autoComplete="new-password"
                />
              </Field>
              <Field
                label="Repite la contraseña nueva"
                error={confirmForm.formState.errors.repeatPassword?.message}
              >
                <Input
                  {...confirmForm.register("repeatPassword")}
                  type="password"
                  autoComplete="new-password"
                />
              </Field>
              <Button
                variant="primary"
                type="submit"
                disabled={confirmForm.formState.isSubmitting}
              >
                {confirmForm.formState.isSubmitting
                  ? "Guardando…"
                  : "Confirmar contraseña nueva"}
              </Button>
            </form>
          </>
        ) : (
          <>
            {requestForm.formState.errors.root?.message ? (
              <div className="mb-4">
                <ErrorState
                  title="No se pudo enviar el código"
                  description={requestForm.formState.errors.root.message}
                />
              </div>
            ) : null}
            <form
              className="space-y-4"
              onSubmit={(event) => void onRequest(event)}
            >
              <Field
                label="Contraseña actual"
                error={requestForm.formState.errors.currentPassword?.message}
              >
                <Input
                  {...requestForm.register("currentPassword")}
                  type="password"
                  autoComplete="current-password"
                />
              </Field>
              <Button
                variant="primary"
                type="submit"
                disabled={requestForm.formState.isSubmitting}
              >
                {requestForm.formState.isSubmitting
                  ? "Enviando…"
                  : "Enviarme el código"}
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function describe(error: unknown): string {
  if (isAtlasApiError(error)) {
    return `${error.message}${error.requestId ? ` · Request ID: ${error.requestId}` : ""}`;
  }
  return "No se pudo completar la operación.";
}
