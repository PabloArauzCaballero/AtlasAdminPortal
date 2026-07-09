"use client";

import { cn } from "@/shared/lib/cn";

export function DetailTabs({
  tabs,
  active,
  onChange,
}: Readonly<{
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}>) {
  return (
    <div className="mb-5 overflow-x-auto rounded-2xl border border-atlas-border bg-white p-1 shadow-subtle">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={cn(
              "rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
              active === tab
                ? "bg-atlas-primary text-white shadow-sm"
                : "text-atlas-muted hover:bg-slate-50 hover:text-atlas-text",
            )}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
