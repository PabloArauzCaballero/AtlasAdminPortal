"use client";

import { Breadcrumbs } from "./breadcrumbs";
import { GlobalSearchBox } from "./global-search-box";
import { LiveDot } from "@/shared/components/ui/badges";
import { NotificationBell } from "@/features/my-notifications/notification-bell";
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
            <LiveDot tone="success" />
            Ambiente: {getRuntimeEnvironmentLabel()} · {getServiceOriginLabel()}
          </p>
        </div>
        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="hidden w-full max-w-sm items-center gap-2 md:flex">
            <GlobalSearchBox />
          </div>
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
