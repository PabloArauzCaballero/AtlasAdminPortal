"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Field, Input } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";

const pinSchema = z.object({
  pin: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "El código son 6 dígitos."),
});

type PinForm = z.infer<typeof pinSchema>;

/**
 * Segundo paso del acceso: el código de 6 dígitos que ATLAS envía al correo de la cuenta.
 *
 * Es un componente aparte y no otro `if` dentro de la pantalla de login porque son dos formularios
 * con validación, errores y estado propios; mezclarlos deja un componente donde la mitad de los
 * campos está siempre deshabilitada y es fácil enviar el paso equivocado.
 *
 * No ofrece "reenviar código": el backend aplica un cooldown de un minuto por cuenta y responde
 * 401 al segundo intento dentro de esa ventana, así que un botón de reenvío sólo produciría un
 * error que parece un fallo del código recibido. Si el correo no llega, el camino es volver atrás
 * y empezar de nuevo pasado el minuto.
 */
export function LoginPinForm({
  expiresInMinutes,
  onVerify,
  onCancel,
}: Readonly<{
  expiresInMinutes: number;
  onVerify: (pin: string) => Promise<void>;
  onCancel: () => void;
}>) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<PinForm>({
    resolver: zodResolver(pinSchema),
    defaultValues: { pin: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await onVerify(values.pin);
    } catch (error) {
      if (isAtlasApiError(error)) {
        setError("root", {
          message: `${error.message}${error.requestId ? ` · Request ID: ${error.requestId}` : ""}`,
        });
        return;
      }
      setError("root", { message: "No se pudo verificar el código." });
    }
  });

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-atlas-text">
          Verifica tu acceso
        </h1>
        <p className="mt-1 text-sm text-atlas-muted">
          Enviamos un código de 6 dígitos al correo de tu cuenta. Vence en{" "}
          {expiresInMinutes} minutos y sólo puede usarse una vez.
        </p>
      </div>

      {errors.root?.message ? (
        <div className="mb-4">
          <ErrorState
            title="No se pudo verificar el código"
            description={errors.root.message}
          />
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
        <Field label="Código de verificación" error={errors.pin?.message}>
          <Input
            {...register("pin")}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
          />
        </Field>
        <Button
          className="w-full"
          variant="primary"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Verificando…" : "Confirmar y entrar"}
        </Button>
        <Button
          className="w-full"
          variant="ghost"
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Usar otra cuenta
        </Button>
      </form>
    </>
  );
}
