"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  clampRectToViewport,
  placeTooltip,
  resolvePlacement,
  selectorFor,
  type Rect,
  type Size,
} from "./dom-utils";
import { TutorialCard } from "./tutorial-card";
import type { EnginePhase } from "./tutorial-engine";
import type { TutorialStep } from "./types";

const CARD_SIZE = { width: 352, height: 300 };
// Cuánto esperamos a que un elemento estático aparezca antes de mostrar el
// estado discreto "ubicando…". Generoso: tras navegar a la herramienta, la
// página puede tardar en montar/compilar. Igual seguimos buscando en cada
// frame, así que si aparece más tarde se resalta de todas formas.
const WAIT_TIMEOUT_MS = 10_000;
const QUICK_TIMEOUT_MS = 6_000;
const DIM = "rgba(15,16,26,0.55)";
const PAD = 6;

type Spotlight = Readonly<{ rect: Rect; viewport: Size }>;

/**
 * Capa de spotlight: encuentra el target por `data-tutorial-id`, RECORTA su
 * rectángulo al viewport y lo resalta atenuando el resto con cuatro bandas
 * (nunca fuera de pantalla, funcione o no el elemento más grande que la
 * ventana). Recalcula cada frame y avisa `onMissingChange` si no aparece.
 */
export function SpotlightOverlay(props: Readonly<OverlayProps>) {
  const { step, onMissingChange } = props;
  const [mounted, setMounted] = useState(false);
  const [spot, setSpot] = useState<Spotlight | null>(null);
  const [cardPos, setCardPos] = useState({ top: 0, left: 0 });

  const scrolledRef = useRef(false);
  const missingRef = useRef<boolean | null>(null);
  const startRef = useRef(0);
  const spotRef = useRef<Spotlight | null>(null);
  const posRef = useRef<{ top: number; left: number } | null>(null);

  useEffect(() => setMounted(true), []);

  // Reinicia el rastreo al cambiar de paso.
  useEffect(() => {
    scrolledRef.current = false;
    missingRef.current = null;
    spotRef.current = null;
    posRef.current = null;
    startRef.current =
      typeof performance !== "undefined" ? performance.now() : 0;
    setSpot(null);
  }, [step.id]);

  useEffect(() => {
    if (!mounted) return;
    let raf = 0;

    const report = (missing: boolean) => {
      if (missingRef.current !== missing) {
        missingRef.current = missing;
        onMissingChange(missing);
      }
    };
    const applySpot = (next: Spotlight | null) => {
      if (!spotEquals(spotRef.current, next)) {
        spotRef.current = next;
        setSpot(next);
      }
    };
    const applyPos = (next: { top: number; left: number }) => {
      if (
        posRef.current?.top !== next.top ||
        posRef.current?.left !== next.left
      ) {
        posRef.current = next;
        setCardPos(next);
      }
    };

    const tick = () => {
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const element = step.target
        ? document.querySelector<HTMLElement>(selectorFor(step.target))
        : null;

      if (element) {
        if (!scrolledRef.current) {
          // "nearest" evita sobre-scrollear un elemento más alto que la ventana.
          element.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
          scrolledRef.current = true;
        }
        const box = element.getBoundingClientRect();
        const full: Rect = {
          top: box.top,
          left: box.left,
          width: box.width,
          height: box.height,
        };
        const clamped = clampRectToViewport(full, viewport);
        if (clamped) {
          report(false);
          applySpot({ rect: clamped, viewport });
          const placement = resolvePlacement(
            clamped,
            CARD_SIZE,
            viewport,
            step.position,
          );
          applyPos(placeTooltip(clamped, CARD_SIZE, viewport, placement));
          raf = window.requestAnimationFrame(tick);
          return;
        }
      }

      // Sin elemento visible: o esperamos una acción que lo revele (no es error),
      // o pasado un tiempo mostramos el estado discreto "ubicando…".
      if (step.target && !step.requiredAction) {
        const elapsed =
          (typeof performance !== "undefined" ? performance.now() : 0) -
          startRef.current;
        const limit = step.waitForElement ? WAIT_TIMEOUT_MS : QUICK_TIMEOUT_MS;
        if (elapsed > limit) report(true);
      } else {
        report(false);
      }
      applySpot(null);
      applyPos(centered(viewport));
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [
    mounted,
    step.id,
    step.target,
    step.position,
    step.waitForElement,
    step.requiredAction,
    onMissingChange,
  ]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[100]"
      data-testid="tutorial-overlay"
    >
      {spot ? <SpotlightMask spot={spot} /> : <FullDim />}
      <div
        className="absolute"
        style={{ top: cardPos.top, left: cardPos.left }}
      >
        <TutorialCard
          step={step}
          phase={props.phase}
          stepIndex={props.stepIndex}
          total={props.total}
          title={props.title}
          isLast={props.isLast}
          onNext={props.onNext}
          onPrev={props.onPrev}
          onSkipStep={props.onSkipStep}
          onSkipTutorial={props.onSkipTutorial}
          onClose={props.onClose}
        />
      </div>
    </div>,
    document.body,
  );
}

/** Atenúa con 4 bandas alrededor del hueco y dibuja el aro. Siempre en pantalla. */
function SpotlightMask({ spot }: Readonly<{ spot: Spotlight }>) {
  const { rect, viewport } = spot;
  const hole = {
    top: Math.max(0, rect.top - PAD),
    left: Math.max(0, rect.left - PAD),
    right: Math.min(viewport.width, rect.left + rect.width + PAD),
    bottom: Math.min(viewport.height, rect.top + rect.height + PAD),
  };
  const band = "pointer-events-none absolute";
  return (
    <>
      <div
        aria-hidden
        className={band}
        style={{
          top: 0,
          left: 0,
          width: viewport.width,
          height: hole.top,
          background: DIM,
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
          background: DIM,
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
          background: DIM,
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
          background: DIM,
        }}
      />
      <div
        aria-hidden
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

function FullDim() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ background: DIM }}
    />
  );
}

function spotEquals(a: Spotlight | null, b: Spotlight | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.rect.top === b.rect.top &&
    a.rect.left === b.rect.left &&
    a.rect.width === b.rect.width &&
    a.rect.height === b.rect.height &&
    a.viewport.width === b.viewport.width &&
    a.viewport.height === b.viewport.height
  );
}

function centered(viewport: { width: number; height: number }) {
  return {
    top: Math.max(16, viewport.height / 2 - CARD_SIZE.height / 2),
    left: Math.max(16, viewport.width / 2 - CARD_SIZE.width / 2),
  };
}

type OverlayProps = {
  step: TutorialStep;
  phase: EnginePhase;
  stepIndex: number;
  total: number;
  title: string;
  isLast: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkipStep: () => void;
  onSkipTutorial: () => void;
  onClose: () => void;
  onMissingChange: (missing: boolean) => void;
};
