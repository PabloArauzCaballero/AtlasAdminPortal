"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/shared/auth/auth-context";
import { sanitizeInternalReturnTo } from "@/shared/auth/return-to";
import { isAtlasApiError } from "@/shared/api/errors";
import { AnimatedBackground } from "@/shared/components/layout/animated-background";
import { Button } from "@/shared/components/ui/button";
import { LoginField } from "./login-field";
import { LoginHero } from "./login-hero";

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
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="relative flex min-h-screen items-stretch overflow-hidden bg-atlas-bg">
      <AnimatedBackground variant="app" />
      <LoginHero />

      <section className="relative flex w-full flex-1 items-center justify-center p-5 lg:w-[54%]">
        <div className="glass w-full max-w-sm animate-scale-in rounded-2xl border border-atlas-border/70 p-6 shadow-card sm:p-7">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-lg font-semibold text-white shadow-md">
              A
            </div>
            <div>
              <h1 className="text-lg font-semibold text-atlas-text">
                Acceso interno ATLAS
              </h1>
              <p className="text-xs text-atlas-muted">Portal interno</p>
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
            <div
              role="alert"
              className="mb-4 flex animate-slide-up items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3 text-sm text-red-800"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold">No se pudo iniciar sesión</p>
                <p className="mt-0.5 text-xs text-red-700">
                  {errors.root.message}
                </p>
              </div>
            </div>
          ) : null}

          <form
            className="space-y-4"
            onSubmit={(event) => void onSubmit(event)}
          >
            <LoginField
              id="login-tenant"
              label="Tenant"
              icon={Building2}
              autoComplete="organization"
              error={errors.tenantId?.message}
              {...register("tenantId")}
            />
            <LoginField
              id="login-email"
              label="Correo interno"
              icon={Mail}
              type="email"
              autoComplete="email"
              placeholder="tu.usuario@atlas.internal"
              error={errors.email?.message}
              {...register("email")}
            />
            <LoginField
              id="login-password"
              label="Contraseña"
              icon={LockKeyhole}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              error={errors.password?.message}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  aria-pressed={showPassword}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-atlas-soft hover:text-atlas-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
              {...register("password")}
            />

            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-atlas-muted">
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-slate-300 text-atlas-accent focus-visible:ring-atlas-accent/40"
                />
                Recordar sesión
              </label>
              <details className="group text-right">
                <summary className="cursor-pointer list-none text-xs font-medium text-atlas-accent hover:underline">
                  ¿Olvidaste tu contraseña?
                </summary>
                <p className="mt-1 text-[0.6875rem] leading-4 text-atlas-muted">
                  Solicita el restablecimiento al administrador del portal.
                </p>
              </details>
            </div>

            <Button
              className="w-full"
              size="lg"
              variant="primary"
              type="submit"
              isLoading={isSubmitting}
              loadingText="Validando…"
            >
              Entrar al portal interno
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
