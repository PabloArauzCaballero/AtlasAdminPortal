"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { Input } from "./input";

/**
 * Un campo de contraseña con el ojito para verla.
 *
 * Quien se equivoca al teclear no tiene cómo saberlo con los puntos: borra todo y vuelve a
 * empezar, o agota los intentos. El botón no entra en el orden de tabulación del formulario
 * (`tabIndex={-1}`): Tab sigue yendo del campo al botón de enviar, y el ojito queda al ratón y al
 * dedo. Al enviar, el campo vuelve solo a ocultarse porque el formulario se desmonta o se limpia.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  // «clave» y no «contraseña»: el nombre del botón no debe contener la etiqueta del campo, o
  // quien busca el campo por su etiqueta (un lector de pantalla, una prueba) encuentra dos cosas.
  const label = visible ? "Ocultar la clave" : "Ver la clave";
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((current) => !current)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        disabled={props.disabled}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 transition-colors hover:text-atlas-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
