"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/shared/auth/auth-context";
import { sanitizeInternalReturnTo } from "@/shared/auth/return-to";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Field, Input } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";

const loginSchema = z.object({
  tenantId: z.string().trim().min(1, "El tenant es obligatorio."),
  email: z.string().trim().email("Ingresa un correo válido."),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      tenantId: process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? "1",
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values);
      router.replace(sanitizeInternalReturnTo(searchParams.get("returnTo")));
    } catch (error) {
      if (isAtlasApiError(error)) {
        setError("root", {
          message: `${error.message}${error.requestId ? ` · Request ID: ${error.requestId}` : ""}`,
        });
        return;
      }
      setError("root", { message: "No se pudo iniciar sesión." });
    }
  });

  return (
    <main className="flex min-h-screen items-stretch bg-atlas-bg">
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-atlas-mesh p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-atlas-radial opacity-60" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">ATLAS</p>
            <p className="text-xs text-slate-300">Portal interno</p>
          </div>
        </div>
        <div className="relative max-w-md animate-fade-in">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Sistemas, QA y gobierno de datos en un solo lugar.
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Monitorea catálogos, calidad de datos, lineage y auditoría
            conectados en tiempo real al servicio interno de ATLAS.
          </p>
        </div>
        <p className="relative text-xs text-slate-400">
          © {new Date().getFullYear()} ATLAS · Uso interno
        </p>
      </section>

      <section className="flex w-full flex-1 items-center justify-center p-4 lg:w-1/2">
        <div className="w-full max-w-md animate-fade-in rounded-2xl border border-atlas-border bg-white p-6 shadow-card lg:border-0 lg:shadow-none">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-slate-900 text-white">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-atlas-text">
                Acceso interno ATLAS
              </h1>
            </div>
          </div>
          <div className="mb-6 hidden lg:block">
            <h1 className="text-2xl font-bold tracking-tight text-atlas-text">
              Bienvenido de vuelta
            </h1>
            <p className="mt-1 text-sm text-atlas-muted">
              Ingresa tus credenciales para continuar.
            </p>
          </div>

          {errors.root?.message ? (
            <div className="mb-4">
              <ErrorState
                title="No se pudo iniciar sesión"
                description={errors.root.message}
              />
            </div>
          ) : null}

          <form
            className="space-y-4"
            onSubmit={(event) => void onSubmit(event)}
          >
            <Field
              label="Tenant"
              error={errors.tenantId?.message}
              hint="Usa el tenant configurado para el ambiente interno."
            >
              <Input {...register("tenantId")} autoComplete="organization" />
            </Field>
            <Field label="Correo interno" error={errors.email?.message}>
              <Input
                {...register("email")}
                type="email"
                autoComplete="email"
              />
            </Field>
            <Field label="Contraseña" error={errors.password?.message}>
              <Input
                {...register("password")}
                type="password"
                autoComplete="current-password"
              />
            </Field>
            <Button
              className="w-full"
              variant="primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Validando…" : "Entrar al portal interno"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
