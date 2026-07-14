"use client";

import { useRef, useState } from "react";
import { LayoutList, Upload } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Field, Textarea } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/cn";
import { parseSteps } from "./journey-form";
import { JourneySequenceTable } from "./journey-step-table";

type StepsEditorMode = "table" | "json";

export function JourneyStepsEditor({
  stepsText,
  onStepsTextChange,
  parsedSteps,
  onParseError,
}: Readonly<{
  stepsText: string;
  onStepsTextChange: (text: string) => void;
  parsedSteps: ReturnType<typeof parseSteps>;
  onParseError: (message: string) => void;
}>) {
  const [editorMode, setEditorMode] = useState<StepsEditorMode>("table");
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      // Se valida que sea JSON antes de reemplazar el editor.
      JSON.parse(text);
      onStepsTextChange(JSON.stringify(JSON.parse(text), null, 2));
      setLoadedFileName(file.name);
    } catch {
      onParseError(`El archivo "${file.name}" no contiene JSON válido.`);
    } finally {
      // Permite recargar el mismo archivo dos veces seguidas.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-atlas-text">
          Secuencia de pasos
        </span>
        <div className="inline-flex overflow-hidden rounded-lg border border-atlas-border text-sm">
          <button
            type="button"
            onClick={() => setEditorMode("table")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5",
              editorMode === "table"
                ? "bg-atlas-primary font-medium text-white"
                : "text-atlas-muted hover:bg-atlas-soft",
            )}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Tabla de secuencia
          </button>
          <button
            type="button"
            onClick={() => setEditorMode("json")}
            className={cn(
              "px-3 py-1.5",
              editorMode === "json"
                ? "bg-atlas-primary font-medium text-white"
                : "text-atlas-muted hover:bg-atlas-soft",
            )}
          >
            JSON / archivo
          </button>
        </div>
      </div>

      {editorMode === "table" ? (
        <JourneySequenceTable
          steps={parsedSteps.ok ? parsedSteps.value : []}
          onChange={(next) => {
            onStepsTextChange(JSON.stringify(next, null, 2));
            setLoadedFileName(null);
          }}
        />
      ) : (
        <Field
          label="Especificación de pasos (JSON)"
          hint="Array de pasos: { key, name, endpointId, pathParams, queryParams, payload, headers, expectedStatusCodes, extract }. Usa {{variable}} para reusar valores extraídos de pasos previos."
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Cargar payload (.json)
            </Button>
            {loadedFileName ? (
              <span className="text-xs text-atlas-muted">
                Cargado: <span className="font-medium">{loadedFileName}</span>
              </span>
            ) : null}
          </div>
          <Textarea
            spellCheck={false}
            value={stepsText}
            onChange={(event) => {
              onStepsTextChange(event.target.value);
              setLoadedFileName(null);
            }}
            className="min-h-64 font-mono text-xs"
          />
        </Field>
      )}
    </div>
  );
}
