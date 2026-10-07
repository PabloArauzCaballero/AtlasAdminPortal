"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { Input } from "./input";

/** Los dígitos del código que ATLAS manda al correo. */
export const PIN_LENGTH = 6;

/**
 * El campo del código de verificación: seis casillas, ni una más.
 *
 * Era una caja de texto a todo el ancho, igual que la del correo: prometía espacio para una frase
 * cuando sólo caben seis dígitos, y dejaba escribir letras que el servidor iba a rechazar. Ahora
 * mide lo que mide el código, sólo admite dígitos y enseña cuántos faltan.
 *
 * Sigue siendo UN `<input>` y no seis: así el autocompletado del código (`one-time-code`), pegar
 * desde el correo y el lector de pantalla funcionan sin trucos.
 */
export function PinInput({
  className,
  onChange,
  ...props
}: Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "inputMode" | "maxLength" | "pattern"
>) {
  return (
    <Input
      autoComplete="one-time-code"
      {...props}
      type="text"
      inputMode="numeric"
      pattern="\d*"
      placeholder={"•".repeat(PIN_LENGTH)}
      onChange={(event) => {
        // El tope lo pone este recorte y no `maxLength`: el navegador corta lo pegado ANTES de
        // limpiarlo, y un código copiado del correo con espacios («481 516») llegaba incompleto.
        event.target.value = event.target.value
          .replace(/\D/g, "")
          .slice(0, PIN_LENGTH);
        onChange?.(event);
      }}
      className={cn(
        // 6 dígitos + 6 separaciones de 0,5em en monoespaciado, más el relleno lateral.
        "h-12 w-[calc(9ch+2.25rem)] max-w-full pl-[calc(1.125rem+0.25em)] pr-[1.125rem] font-mono text-xl tracking-[0.5em] placeholder:text-slate-300",
        className,
      )}
    />
  );
}
