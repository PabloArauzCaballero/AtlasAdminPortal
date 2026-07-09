"use client";

import { useMemo } from "react";
import { Button } from "@/shared/components/ui/button";

export function QaLogDownload({
  fileName,
  lines,
}: Readonly<QaLogDownloadProps>) {
  const href = useMemo(() => buildLogHref(lines), [lines]);
  if (!lines?.length) return null;
  return (
    <a
      href={href}
      download={fileName}
      onClick={() => setTimeout(() => URL.revokeObjectURL(href), 0)}
    >
      <Button>Descargar logs Pino</Button>
    </a>
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
