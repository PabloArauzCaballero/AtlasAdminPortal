"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export function QaLogDownload({
  fileName,
  lines,
}: Readonly<QaLogDownloadProps>) {
  const href = useMemo(() => buildLogHref(lines), [lines]);
  const [copied, setCopied] = useState(false);
  if (!lines?.length) return null;

  async function copyLogs() {
    await navigator.clipboard.writeText(`${lines.join("\n")}\n`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={href}
        download={fileName}
        onClick={() => setTimeout(() => URL.revokeObjectURL(href), 0)}
      >
        <Button>Descargar logs Pino</Button>
      </a>
      <Button onClick={() => void copyLogs()}>
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        {copied ? "Copiado" : "Copiar logs"}
      </Button>
    </div>
  );
}

function buildLogHref(lines: string[]): string {
  const content = `${lines.join("\n")}\n`;
  return URL.createObjectURL(
    new Blob([content], { type: "application/x-ndjson" }),
  );
}

type QaLogDownloadProps = {
  fileName: string;
  lines: string[];
};
