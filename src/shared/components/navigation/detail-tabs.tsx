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
    <div className="mb-5 overflow-x-auto rounded-lg border border-atlas-border bg-atlas-soft p-1">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-150",
              active === tab
                ? "bg-white text-atlas-text shadow-subtle"
                : "text-atlas-muted hover:bg-white/60 hover:text-atlas-text",
            )}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
