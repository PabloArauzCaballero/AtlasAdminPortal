"use client";

import type { Rect, Size } from "./dom-utils";

export const DIM = "rgba(15,16,26,0.6)";
/** Velo suave para los pasos que esperan una acción: los diálogos que la
 * herramienta abra (confirmaciones, cajones) quedan legibles bajo él. */
export const DIM_SOFT = "rgba(15,16,26,0.25)";
const PAD = 6;

export type Spotlight = Readonly<{ rect: Rect; viewport: Size }>;

/**
 * Atenúa con cuatro bandas alrededor del hueco y dibuja un aro pulsante.
 *
 * Las bandas RECIBEN los clics y no hacen nada con ellos: es el velo el que
 * impide que alguien pulse detrás del tutorial algo que lo saque del hilo.
 * Sólo el hueco (el elemento explicado) y la tarjeta son interactivos.
 */
export function SpotlightMask({
  spot,
  blocking,
  dim = DIM,
}: Readonly<{ spot: Spotlight; blocking: boolean; dim?: string }>) {
  const { rect, viewport } = spot;
  const hole = {
    top: Math.max(0, rect.top - PAD),
    left: Math.max(0, rect.left - PAD),
    right: Math.min(viewport.width, rect.left + rect.width + PAD),
    bottom: Math.min(viewport.height, rect.top + rect.height + PAD),
  };
  const band = blocking
    ? "pointer-events-auto absolute"
    : "pointer-events-none absolute";
  return (
    <>
      <div
        aria-hidden
        data-testid="tutorial-veil"
        className={band}
        style={{
          top: 0,
          left: 0,
          width: viewport.width,
          height: hole.top,
          background: dim,
        }}
      />
      <div
        aria-hidden
        className={band}
        style={{
          top: hole.bottom,
          left: 0,
          width: viewport.width,
          height: Math.max(0, viewport.height - hole.bottom),
          background: dim,
        }}
      />
      <div
        aria-hidden
        className={band}
        style={{
          top: hole.top,
          left: 0,
          width: hole.left,
          height: hole.bottom - hole.top,
          background: dim,
        }}
      />
      <div
        aria-hidden
        className={band}
        style={{
          top: hole.top,
          left: hole.right,
          width: Math.max(0, viewport.width - hole.right),
          height: hole.bottom - hole.top,
          background: dim,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-lg ring-4 ring-atlas-accent/40 animate-pulse"
        style={{
          top: hole.top - 4,
          left: hole.left - 4,
          width: hole.right - hole.left + 8,
          height: hole.bottom - hole.top + 8,
        }}
      />
      <div
        aria-hidden
        data-testid="tutorial-spot"
        className="pointer-events-none absolute rounded-lg ring-2 ring-atlas-accent transition-[top,left,width,height] duration-150"
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.right - hole.left,
          height: hole.bottom - hole.top,
        }}
      />
    </>
  );
}

/** Sin elemento que resaltar: todo atenuado (bloquea sólo si se le pide). */
export function FullDim({
  blocking,
  dim = DIM,
}: Readonly<{ blocking: boolean; dim?: string }>) {
  return (
    <div
      aria-hidden
      data-testid="tutorial-veil"
      className={
        blocking
          ? "pointer-events-auto absolute inset-0"
          : "pointer-events-none absolute inset-0"
      }
      style={{ background: dim }}
    />
  );
}
