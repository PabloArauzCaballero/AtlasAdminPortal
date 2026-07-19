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
    <main className="flex min-h-screen items-stretch bg-[#F6F7F8]">
      <section className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-atlas-mesh p-12 text-white lg:flex">
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06]">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.08em]">ATLAS</p>
            <p className="text-[0.6875rem] text-slate-500">Portal interno</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <p className="mb-4 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-[#9AABEF]">
            Control operativo
          </p>
          <h2 className="text-3xl font-semibold leading-[1.15] tracking-[-0.035em]">
            Sistemas, QA y gobierno de datos en un solo lugar.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
            Monitorea catálogos, calidad de datos, lineage y auditoría
            conectados en tiempo real al servicio interno de ATLAS.
          </p>
        </div>
        <p className="relative text-[0.6875rem] text-slate-600">
          © {new Date().getFullYear()} ATLAS · Uso interno
        </p>
      </section>

      <section className="flex w-full flex-1 items-center justify-center p-5 lg:w-[54%]">
        <div className="w-full max-w-sm rounded-xl border border-atlas-border bg-white p-6 shadow-card lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-atlas-primary text-white">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-atlas-text">
                Acceso interno ATLAS
              </h1>
            </div>
          </div>
          <div className="mb-6 hidden lg:block">
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-atlas-text">
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
              <Input {...register("email")} type="email" autoComplete="email" />
            </Field>
            <Field label="Contraseña" error={errors.password?.message}>
              <Input
                {...register("password")}
                type="password"
                autoComplete="current-password"
              />
            </Field>
            <Button
              className="h-10 w-full"
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
