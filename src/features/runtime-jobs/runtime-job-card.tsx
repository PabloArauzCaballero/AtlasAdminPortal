"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { isAtlasApiError } from "@/shared/api/errors";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Input } from "@/shared/components/ui/input";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { ErrorState } from "@/shared/components/ui/states";
import { useRunRuntimeJobMutation } from "./hooks";
import {
  buildRuntimeJobBody,
  emptyRuntimeJobForm,
  runtimeJobFormSchema,
  type RuntimeJobForm,
} from "./runtime-job-schema";
import type {
  RuntimeJobBody,
  RuntimeJobDefinition,
  RuntimeJobRun,
} from "./types";

export function RuntimeJobCard({
  definition,
}: Readonly<{ definition: RuntimeJobDefinition }>) {
  const mutation = useRunRuntimeJobMutation(definition.code);
  const [lastRun, setLastRun] = useState<RuntimeJobRun | null>(null);
  const [pendingBody, setPendingBody] = useState<RuntimeJobBody | null>(null);
  const dryRunId = useId();
  const listId = useId();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RuntimeJobForm>({
    resolver: zodResolver(runtimeJobFormSchema),
    defaultValues: emptyRuntimeJobForm,
  });

  const dryRun = watch("dryRun");

  function run(body: RuntimeJobBody) {
    mutation.mutate(body, {
      onSuccess: (result) => {
        setLastRun(result);
        setPendingBody(null);
      },
    });
  }

  // Un ensayo no escribe nada, así que va directo. La ejecución real siempre
  // pasa por confirmación: estos jobs borran, anonimizan y expiran sesiones.
  const onSubmit = handleSubmit((values) => {
    const body = buildRuntimeJobBody(definition, values);
    if (body.dryRun) {
      run(body);
      return;
    }
    setPendingBody(body);
  });

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title={definition.title}
          description={definition.systems}
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-atlas-muted">{definition.business}</p>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {definition.fields.map((field) => (
            <Field
              key={field.name}
              label={field.label}
              hint={field.hint}
              error={errors[field.name]?.message}
            >
              <Input
                placeholder={field.placeholder}
                list={field.options ? `${listId}-${field.name}` : undefined}
                {...register(field.name)}
              />
              {field.options ? (
                <datalist id={`${listId}-${field.name}`}>
                  {field.options.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              ) : null}
            </Field>
          ))}

          <label
            htmlFor={dryRunId}
            className="flex items-start gap-2 rounded-lg border border-atlas-border p-3 text-sm"
          >
            <input
              id={dryRunId}
              type="checkbox"
              className="mt-0.5"
              {...register("dryRun")}
            />
            <span>
              <strong>Solo ensayo (dry-run)</strong>
              <span className="block text-xs text-atlas-muted">
                Calcula y reporta lo que haría, sin escribir nada. Desmarcar
                ejecuta de verdad.
              </span>
            </span>
          </label>

          {mutation.error ? (
            <ErrorState
              description={
                isAtlasApiError(mutation.error)
                  ? mutation.error.message
                  : "No se pudo ejecutar el job."
              }
              requestId={
                isAtlasApiError(mutation.error)
                  ? mutation.error.requestId
                  : undefined
              }
            />
          ) : null}

          <Button
            type="submit"
            variant={dryRun ? "primary" : "danger"}
            isLoading={mutation.isPending}
            loadingText="Ejecutando…"
            disabled={mutation.isPending}
          >
            {dryRun ? "Ejecutar ensayo" : "Ejecutar en real"}
          </Button>
        </form>

        {lastRun ? <RuntimeJobResult run={lastRun} /> : null}
      </CardContent>

      <ConfirmDialog
        open={pendingBody !== null}
        title={`Ejecutar "${definition.title}" en real`}
        description={
          definition.destructive
            ? "Esta ejecución escribe sobre datos productivos y no se puede deshacer desde el portal. Corre primero el ensayo y revisa el resultado."
            : "Esta ejecución procesa la cola de verdad. Confirma que es lo que quieres."
        }
        confirmText="Ejecutar en real"
        isLoading={mutation.isPending}
        typedConfirmationPhrase={
          definition.destructive ? definition.code : undefined
        }
        onConfirm={() => {
          if (pendingBody) run(pendingBody);
        }}
        onCancel={() => setPendingBody(null)}
      />
    </Card>
  );
}

function RuntimeJobResult({ run }: Readonly<{ run: RuntimeJobRun }>) {
  return (
    <div className="space-y-3 rounded-lg border border-atlas-border bg-atlas-soft p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone="success">{run.status}</Badge>
        <span className="text-atlas-muted">
          Job run <span className="font-mono text-xs">#{run.jobRunId}</span>
        </span>
      </div>
      <JsonViewer value={run.result} title="Resultado" />
    </div>
  );
}
