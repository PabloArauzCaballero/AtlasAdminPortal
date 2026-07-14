"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export function CopyButton({
  value,
  className,
}: Readonly<{ value: string; className?: string }>) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      title="Copiar"
      aria-label="Copiar"
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-atlas-border bg-white text-atlas-muted transition-colors hover:border-slate-300 hover:text-atlas-text",
        className,
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function CopyableCode({
  value,
  className,
}: Readonly<{ value: string; className?: string }>) {
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <code className="min-w-0 flex-1 break-words rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-atlas-text">
        {value}
      </code>
      <CopyButton value={value} />
    </div>
  );
}
