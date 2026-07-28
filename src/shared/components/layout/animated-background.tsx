"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/shared/lib/cn";

/**
 * Fondo ambiental animado y reutilizable. Aporta profundidad y movimiento sutil
 * sin distraer ni pesar: sólo `transform`/`opacity` (compositor), decorativo
 * (`aria-hidden`) y sin capturar eventos. La animación se detiene sola con
 * `prefers-reduced-motion` (regla global en globals.css).
 *
 * - `variant="auth"`: rico y oscuro, para el hero del login.
 * - `variant="app"`: muy tenue y claro, para el fondo general de la app.
 * `interactive` añade un glow radial que sigue al cursor (se omite con
 * reduced-motion o punteros táctiles, por rendimiento).
 */
export function AnimatedBackground({
  variant = "app",
  interactive = false,
  className,
}: Readonly<{
  variant?: "auth" | "app";
  interactive?: boolean;
  className?: string;
}>) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!interactive) return;
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    if (reduce || coarse) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        root.style.setProperty(
          "--mx",
          `${(event.clientX / window.innerWidth) * 100}%`,
        );
        root.style.setProperty(
          "--my",
          `${(event.clientY / window.innerHeight) * 100}%`,
        );
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [interactive]);

  if (variant === "auth") {
    return (
      <div
        ref={rootRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 overflow-hidden bg-atlas-aurora",
          interactive && "cursor-glow",
          className,
        )}
      >
        <Blob className="left-[-6rem] top-[-4rem] h-72 w-72 bg-atlas-accent/40 animate-blob" />
        <Blob className="right-[-5rem] top-[20%] h-64 w-64 bg-[#6656C7]/40 animate-blob-slow [animation-delay:-6s]" />
        <Blob className="bottom-[-6rem] left-[30%] h-80 w-80 bg-[#356FC0]/30 animate-blob [animation-delay:-12s]" />
        <div className="bg-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(80%_80%_at_50%_30%,black,transparent)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-app-ambient",
        className,
      )}
    >
      <Blob className="right-[-8rem] top-[-6rem] h-72 w-72 bg-atlas-accent/[0.07] animate-blob-slow" />
      <Blob className="bottom-[-8rem] left-[-6rem] h-80 w-80 bg-[#6656C7]/[0.06] animate-blob [animation-delay:-10s]" />
    </div>
  );
}

function Blob({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      className={cn(
        "absolute rounded-full blur-3xl will-change-transform",
        className,
      )}
    />
  );
}
