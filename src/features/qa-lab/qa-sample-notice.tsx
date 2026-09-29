import { TriangleAlert } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import type { readContract } from "./contract-fields";
import { KIND_INTENT, KIND_LABELS, type QaCaseKind } from "./qa-case-generator";

const KIND_TONE: Record<QaCaseKind, "success" | "warning" | "critical"> = {
  valid: "success",
  boundary: "warning",
  invalid: "critical",
};

function Warning({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function SampleNotice({
  kind,
  contract,
  canGenerate,
  failure,
}: Readonly<{
  kind: QaCaseKind;
  contract: ReturnType<typeof readContract>;
  canGenerate: boolean;
  failure: string | null;
}>) {
  if (failure) return <Warning>{failure}</Warning>;
  /*
   * Un contrato que es sólo un puntero al esquema del backend NO se puede generar, y decirlo con
   * precisión evita la conclusión falsa: el problema no es la operación ni el laboratorio, es que
   * el catálogo no publica sus campos.
   */
  if (contract.isReference) {
    return (
      <Warning>
        El catálogo sólo publica el nombre de la regla del servidor (
        <code className="font-mono">{contract.referenceName}</code>), no sus
        campos: no hay de qué derivar los datos. Usa el ejemplo de esta
        operación si existe, o escribe los datos a mano.
      </Warning>
    );
  }
  if (!canGenerate) {
    return (
      <Warning>
        El catálogo no declara qué datos de entrada lleva esta operación, así
        que no hay campos que generar. Escribe los datos a mano.
      </Warning>
    );
  }
  return (
    <p className="flex items-start gap-2 text-xs text-atlas-muted">
      <Badge tone={KIND_TONE[kind]}>{KIND_LABELS[kind]}</Badge>
      <span>
        {KIND_INTENT[kind]} Los campos salen del contrato que publica el
        catálogo (no de las reglas finas del servidor); los datos de persona,
        del generador de datos de prueba con la semilla elegida.
      </span>
    </p>
  );
}
