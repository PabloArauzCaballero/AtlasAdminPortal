import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  actions,
}: Readonly<{
  title: string;
  description?: string;
  eyebrow?: string;
  /**
   * Icono del módulo. No es decoración: en un portal de noventa vistas cuyas cabeceras comparten
   * tipografía y color, es la única señal que distingue una pantalla de otra antes de leerla.
   */
  icon?: LucideIcon;
  actions?: React.ReactNode;
}>) {
  return (
    /*
     * La cabecera va SOBRE el lienzo, no dentro de una tarjeta.
     *
     * Era una tarjeta con filo de acento, degradado blanco→gris, radial de marca y una loseta
     * negra con halo para el icono: cinco adornos compitiendo por delante del título, en todas
     * las vistas del portal. En un sistema donde el color es señal, un bloque casi negro del
     * tamaño de un pulgar es lo más llamativo de la pantalla y no significa nada.
     *
     * La composición es ahora la misma que la del ERP (`WorkspaceHeader`): eyebrow tenue, título
     * en el verde de ATLAS y descripción sobre el fondo. Las dos aplicaciones abren la pantalla
     * igual, que es lo que hace que se lean como un solo producto.
     */
    <header className="mb-6 flex animate-fade-in flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-atlas-accentSoft text-atlas-accent sm:flex">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-atlas-muted">
              {eyebrow}
            </p>
          ) : null}
          {/* El título se recompone en móvil en vez de encogerse: a 30 px sobre 360 px de ancho
              parte en tres líneas y empuja el contenido fuera de la primera pantalla. */}
          <h1 className="text-pretty break-words text-xl font-bold leading-tight tracking-tight text-atlas-accent sm:text-2xl md:text-[30px] md:leading-[38px]">
            {title}
          </h1>
          {/* `break-words` por lo mismo que el título: casi todas estas descripciones citan la
              ruta del backend a la que se conectan, y una ruta no tiene dónde partirse. La más
              larga —`/operations/catalogs/:catalogCode/versions/:versionId`, 54 caracteres— se
              salía de la pantalla a 320 px y arrastraba a la página entera. */}
          {description ? (
            <p className="mt-1 max-w-3xl break-words text-sm leading-6 text-atlas-muted">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {/* Carril arrastrable en móvil: tres botones de cabecera se envolvían en tres líneas que
          empujaban el contenido fuera de la primera pantalla. */}
      {actions ? (
        <div className="atlas-rail -mx-3 flex shrink-0 items-center gap-2 overflow-x-auto px-3 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  icon: Icon,
  className,
}: Readonly<{
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}>) {
  return (
    <div className={cn("mb-3", className)}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-atlas-text">
        {Icon ? (
          <Icon className="h-4 w-4 shrink-0 text-atlas-accent" aria-hidden />
        ) : null}
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-sm text-atlas-muted">{description}</p>
      ) : null}
    </div>
  );
}
