"use client";

import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { OptionSelect } from "@/shared/components/ui/option-select";
import { ICON_OPTIONS } from "./icon-options";
import { iconFromFile, IconUploadError } from "./icon-upload";
import type { ContentBullet } from "./types";

/**
 * El icono de un punto: uno de Atlas o uno propio.
 *
 * El propio GANA sobre el de la lista mientras exista. Quitarlo devuelve el de Atlas sin perder la
 * elección anterior: por eso los dos campos conviven en vez de sustituirse.
 */
export function IconPicker({
  bullet,
  onChange,
  testId,
}: Readonly<{
  bullet: ContentBullet;
  onChange: (cambios: Partial<ContentBullet>) => void;
  testId: string;
}>) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      onChange({ iconImage: await iconFromFile(file) });
    } catch (caught) {
      setError(
        caught instanceof IconUploadError
          ? caught.message
          : "No se pudo cargar el icono.",
      );
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {bullet.iconImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URI de 96 px: next/image no aporta nada
          <img
            src={bullet.iconImage}
            alt="Icono propio"
            data-testid={`${testId}-imagen`}
            className="h-10 w-10 shrink-0 rounded-lg border border-atlas-border bg-white object-contain p-1"
          />
        ) : (
          <OptionSelect
            name={`${testId}-nombre`}
            options={ICON_OPTIONS}
            value={bullet.icon ?? ""}
            onChange={(value) => onChange({ icon: value || null })}
            placeholder="Icono de Atlas"
            ariaLabel="Icono de Atlas"
            className="w-44"
          />
        )}
        <input
          ref={input}
          type="file"
          accept="image/png,image/webp"
          className="sr-only"
          data-testid={`${testId}-archivo`}
          onChange={(event) => {
            void cargar(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <Button
          variant="secondary"
          onClick={() => input.current?.click()}
          className="h-10 shrink-0"
        >
          <Upload className="h-4 w-4" aria-hidden />
          {bullet.iconImage ? "Cambiar" : "Cargar el tuyo"}
        </Button>
        {bullet.iconImage ? (
          <Button
            variant="ghost"
            onClick={() => onChange({ iconImage: null })}
            aria-label="Quitar el icono propio y volver al de Atlas"
            className="h-10 w-10 shrink-0 px-0 text-atlas-muted hover:text-red-600"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
