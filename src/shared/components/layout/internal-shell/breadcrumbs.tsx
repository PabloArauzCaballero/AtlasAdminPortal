"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { breadcrumbLabels } from "./breadcrumb-labels";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean).slice(1);

  if (segments.length === 0) return <span>Inicio</span>;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1 text-xs text-atlas-muted"
    >
      <Link
        href="/internal"
        className="transition-colors hover:text-atlas-accent"
      >
        Inicio
      </Link>
      {segments.map((segment, index) => (
        <span key={`${segment}-${index}`} className="flex items-center gap-1">
          <span className="text-slate-300">/</span>
          <span
            className={
              index === segments.length - 1
                ? "font-semibold text-atlas-text"
                : ""
            }
          >
            {breadcrumbLabels[segment] ?? segment}
          </span>
        </span>
      ))}
    </nav>
  );
}
