"use client";

import Link from "next/link";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/badges";
import type { ReadyItem } from "./readiness-types";

export function ReadinessChecklist({
  items,
}: Readonly<{ items: ReadyItem[] }>) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Checklist de release"
          description="Detecta deuda de catálogo, QA, gobierno y riesgo antes de avanzar."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-lg border border-atlas-border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-atlas-text">
                  {item.label}
                </h3>
                <p className="mt-1 text-sm text-atlas-muted">{item.detail}</p>
              </div>
              <StatusBadge value={item.status} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ReadinessActions() {
  const actions = [
    ["Resolver revisión", "/internal/review-queue"],
    ["Sincronizar catálogo", "/internal/settings/catalog-sync"],
    ["Cerrar issues calidad", "/internal/data-quality/issues"],
    ["Revisar gobierno", "/internal/governance/policies"],
  ] as const;

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Acciones recomendadas"
          description="Pantallas donde se resuelven pendientes."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map(([label, href]) => (
          <Link
            key={href}
            className="rounded-md border border-atlas-border p-4 text-sm font-medium hover:bg-atlas-soft"
            href={href}
          >
            {label}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
