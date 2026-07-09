"use client";

import { AppSidebar } from "./internal-shell/app-sidebar";
import { AppTopbar } from "./internal-shell/app-topbar";

export function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-atlas-bg text-atlas-text">
      <AppSidebar />
      <div className="lg:pl-[268px]">
        <AppTopbar />
        <main className="px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
