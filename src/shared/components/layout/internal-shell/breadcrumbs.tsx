"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { breadcrumbLabels } from "./breadcrumb-labels";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean).slice(1);

  if (segments.length === 0) return <span>Inicio</span>;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden whitespace-nowrap text-[0.6875rem] text-atlas-muted"
    >
      <Link
        href="/internal"
        className="shrink-0 transition-colors duration-150 hover:text-atlas-text"
      >
        Inicio
      </Link>
      {segments.map((segment, index) => (
        <span
          key={`${segment}-${index}`}
          className={
            index === segments.length - 1
              ? "flex min-w-0 items-center gap-1"
              : "hidden items-center gap-1 sm:flex"
          }
        >
          <ChevronRight className="h-3 w-3 text-slate-400" aria-hidden />
          <span
            className={
              index === segments.length - 1
                ? "truncate font-semibold text-atlas-text"
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
