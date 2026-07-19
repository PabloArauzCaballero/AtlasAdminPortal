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
        "rounded-xl border border-atlas-border bg-white shadow-subtle transition-[border-color,box-shadow,background-color] duration-150",
        interactive && "hover:border-slate-300 hover:shadow-card-hover",
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
