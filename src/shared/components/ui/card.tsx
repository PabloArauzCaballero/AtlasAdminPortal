import { cn } from "@/shared/lib/cn";

export function Card({
  className,
  children,
  interactive = false,
}: Readonly<{
  className?: string;
  children: React.ReactNode;
  interactive?: boolean;
}>) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-atlas-border bg-white shadow-card transition-all duration-200",
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
    <div
      className={cn(
        "border-b border-atlas-border px-5 py-4",
        className,
      )}
    >
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
