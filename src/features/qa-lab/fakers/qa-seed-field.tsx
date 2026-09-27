"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Select } from "@/shared/components/ui/input";
import {
  describeQaSeed,
  freshQaSeed,
  NEW_PEOPLE_SEED,
  qaSeedOptions,
} from "../qa-seed-catalog";

/**
 * Elegir el lote de personas: una semilla con nombre (repite siempre las mismas personas) o
 * «Personas nuevas», que inventa una semilla única y la deja VISIBLE para poder repetirla. La caja
 * de texto admite pegar una semilla de otra corrida para reproducirla tal cual.
 */
export function QaSeedField({
  seed,
  onChange,
  name = "semilla",
}: Readonly<{
  seed: string;
  onChange: (seed: string) => void;
  name?: string;
}>) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard
      ?.writeText(seed)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => undefined);
  }

  return (
    <div className="space-y-2">
      <Field
        label="Personas de prueba"
        tooltip="Qué lote de personas se usa. La misma semilla genera siempre las mismas personas; «Personas nuevas» crea un lote que nunca se usó."
        hint={describeQaSeed(seed)}
      >
        <Select
          name={name}
          value={seed}
          onChange={(value) =>
            onChange(value === NEW_PEOPLE_SEED ? freshQaSeed() : value)
          }
          options={qaSeedOptions(seed)}
        />
      </Field>
      <div className="flex items-end gap-2">
        <Field
          label="Semilla"
          tooltip="El nombre exacto del lote. Cópialo para repetir la misma corrida, o pega aquí el de otra."
        >
          <Input
            value={seed}
            maxLength={80}
            onChange={(event) => onChange(event.target.value)}
            className="font-mono text-xs"
          />
        </Field>
        <Button
          variant="ghost"
          aria-label="Copiar la semilla"
          title="Copiar la semilla"
          onClick={copy}
        >
          {copied ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
        </Button>
      </div>
    </div>
  );
}
