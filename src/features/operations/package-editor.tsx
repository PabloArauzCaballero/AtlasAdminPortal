"use client";

import { useState } from "react";
import type { z } from "zod";
import { isAtlasApiError } from "@/shared/api/errors";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";

export type PackageSummaryEntry = { label: string; count: number };

type PackageIssue = { path: string; message: string };

/**
 * Editor de paquetes JSON con validación local contra el esquema del backend.
 *
 * Por qué un editor de JSON y no un formulario: los tres endpoints de paquete
 * (`definitions/package`, `risk-policy/ruleset-versions`,
 * `data-governance/policy-package`) son imports masivos — arrays de 200 a 500
 * elementos con ~20 campos cada uno, y algunos con JSON arbitrario adentro
 * (`expressionJson`). Un formulario de 30 campos × 500 filas sería una mentira
 * sobre lo que hace el endpoint. Lo honesto es editar el paquete y validarlo
 * con la misma forma que exige el backend antes de mandarlo.
 *
 * El flujo es: validar → ver qué se va a mandar (conteos por tipo) → confirmar.
 * Nunca se envía nada sin que el operador vea el resumen: un paquete reescribe
 * en lote el vocabulario o las políticas de un dominio entero.
 */
export function PackageEditor<T>({
  schema,
  template,
  summarize,
  confirmPhrase,
  confirmDescription,
  submitLabel,
  onSubmit,
  isPending,
  error,
  successNode,
}: Readonly<{
  /** Esquema del paquete: entra JSON sin tipar, sale el body ya validado. */
  schema: z.ZodType<T, unknown>;
  template: string;
  summarize: (value: T) => PackageSummaryEntry[];
  confirmPhrase: string;
  confirmDescription: string;
  submitLabel: string;
  onSubmit: (value: T) => void;
  isPending: boolean;
  error: unknown;
  successNode?: React.ReactNode;
}>) {
  const [text, setText] = useState(template);
  const [issues, setIssues] = useState<PackageIssue[] | null>(null);
  const [parsed, setParsed] = useState<T | null>(null);
  const [confirming, setConfirming] = useState(false);

  function validate() {
    setParsed(null);
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      setIssues([
        {
          path: "(raíz)",
          message: "JSON inválido: revisa comillas, comas y llaves.",
        },
      ]);
      return;
    }
    const result = schema.safeParse(json);
    if (!result.success) {
      setIssues(
        result.error.issues.map((issue) => ({
          path: issue.path.length > 0 ? issue.path.join(".") : "(raíz)",
          message: issue.message,
        })),
      );
      return;
    }
    setIssues([]);
    setParsed(result.data);
  }

  // Editar invalida el resultado anterior: si no, se podría validar, cambiar el
  // texto y mandar un paquete que nunca pasó por el esquema.
  function edit(value: string) {
    setText(value);
    setIssues(null);
    setParsed(null);
  }

  const summary = parsed ? summarize(parsed) : [];
  const totalRecords = summary.reduce((total, entry) => total + entry.count, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <SectionHeader
            title="Paquete"
            description="Se valida acá con el mismo esquema que exige el backend. Nada se envía hasta confirmar."
            className="mb-0"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Contenido del paquete (JSON)">
            <Textarea
              value={text}
              onChange={(event) => edit(event.target.value)}
              rows={20}
              spellCheck={false}
              className="font-mono text-xs"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={validate}>
              Validar paquete
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => edit(template)}
            >
              Restaurar plantilla
            </Button>
          </div>

          {issues && issues.length > 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-800">
                {formatNumber(issues.length)} error(es) de validación:
              </p>
              <ul className="mt-2 space-y-1">
                {issues.map((issue) => (
                  <li
                    key={`${issue.path}-${issue.message}`}
                    className="text-xs text-red-800"
                  >
                    <span className="font-mono font-semibold">
                      {issue.path}
                    </span>
                    : {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {parsed ? (
        <Card>
          <CardHeader>
            <SectionHeader
              title="Qué se va a enviar"
              description="Resumen del paquete validado. Revísalo antes de aplicar: los paquetes escriben en lote."
              className="mb-0"
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {summary.map((entry) => (
                <Badge
                  key={entry.label}
                  tone={entry.count > 0 ? "info" : "muted"}
                >
                  {formatNumber(entry.count)} {entry.label}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-atlas-muted">
              Total: {formatNumber(totalRecords)} registro(s) en el paquete.
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={() => setConfirming(true)}
              isLoading={isPending}
              loadingText="Aplicando…"
              disabled={isPending}
            >
              {submitLabel}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <ErrorState
          title="No se pudo aplicar el paquete"
          description={
            isAtlasApiError(error)
              ? error.message
              : "Error inesperado al aplicar el paquete."
          }
          requestId={isAtlasApiError(error) ? error.requestId : undefined}
        />
      ) : null}
      {successNode}

      <ConfirmDialog
        open={confirming}
        title={submitLabel}
        description={confirmDescription}
        confirmText={submitLabel}
        isLoading={isPending}
        typedConfirmationPhrase={confirmPhrase}
        onConfirm={() => {
          if (parsed) onSubmit(parsed);
          setConfirming(false);
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
