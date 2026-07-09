"use client";

import { X } from "lucide-react";
import { Button } from "./button";

export function DrawerPanel({
  open,
  title,
  children,
  onClose,
}: Readonly<{
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}>) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/30">
      <aside className="atlas-scrollbar ml-auto h-full w-full max-w-xl overflow-auto border-l border-atlas-border bg-white shadow-subtle">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-atlas-border bg-white px-5 py-4">
          <h2 className="text-sm font-semibold text-atlas-text">{title}</h2>
          <Button
            variant="ghost"
            className="h-8 w-8 px-0"
            onClick={onClose}
            aria-label="Cerrar panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </aside>
    </div>
  );
}
