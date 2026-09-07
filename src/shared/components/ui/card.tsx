import { cn } from "@/shared/lib/cn";

/**
 * La tarjeta es SOLO el marco: filo, fondo y sombra. No lleva relleno propio.
 *
 * Quien mete contenido dentro debe darle el suyo, y hay dos formas de hacerlo: componer con
 * `CardHeader` + `CardContent` (lo que hace la mayoría del portal) o pasar el relleno en
 * `className` (`p-5`, el mismo que usa `CardContent`). Contenido suelto y sin relleno se pega al
 * borde y, en las esquinas, se sale por fuera del radio: era el fallo visible en «Datos externos
 * del cliente», «Verificación de expedientes» y «Cartera».
 */
export function Card({
  className,
  children,
  interactive = false,
  // Identificador estable para las pruebas E2E. Se declara explícito en vez de abrir la tarjeta a
  // todos los props de `section`: lo que se quiere es poder señalar UNA tarjeta concreta en una
  // rejilla de tarjetas iguales, no convertir el componente en un `div` con estilos.
  testId,
}: Readonly<{
  className?: string;
  children: React.ReactNode;
  interactive?: boolean;
  testId?: string;
}>) {
  return (
    <section
      data-testid={testId}
      className={cn(
        "rounded-2xl border border-atlas-border bg-white/80 shadow-card backdrop-blur-[2px] transition-all duration-200",
        interactive &&
          "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  className,
  children,
}: Readonly<{ className?: string; children: React.ReactNode }>) {
  return (
    <div className={cn("border-b border-atlas-border px-5 py-4", className)}>
      {children}
    </div>
  );
}

export function CardContent({
  className,
  children,
}: Readonly<{ className?: string; children: React.ReactNode }>) {
  return <div className={cn("p-5", className)}>{children}</div>;
}
