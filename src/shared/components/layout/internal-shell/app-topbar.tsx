"use client";

import { Breadcrumbs } from "./breadcrumbs";
import { GlobalSearchBox } from "./global-search-box";
import {
  getRuntimeEnvironmentLabel,
  getServiceOriginLabel,
} from "@/shared/lib/runtime-environment";

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-atlas-border bg-white/80 shadow-sm backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="min-w-0">
          <Breadcrumbs />
          <p className="mt-1 flex items-center gap-1.5 text-xs text-atlas-muted">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-ring" />
            Ambiente: {getRuntimeEnvironmentLabel()} · {getServiceOriginLabel()}
          </p>
        </div>
        <div className="hidden w-full max-w-sm items-center gap-2 md:flex">
          <GlobalSearchBox />
        </div>
      </div>
    </header>
  );
}
