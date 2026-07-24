"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  placeTooltip,
  resolvePlacement,
  selectorFor,
  type Rect,
} from "./dom-utils";
import { TutorialCard } from "./tutorial-card";
import type { EnginePhase } from "./tutorial-engine";
import type { TutorialStep } from "./types";

const CARD_SIZE = { width: 352, height: 300 };
const WAIT_TIMEOUT_MS = 4000;
const QUICK_TIMEOUT_MS = 400;

/**
 * Capa de spotlight: encuentra el target por `data-tutorial-id`, lo resalta
 * atenuando el resto, y coloca la tarjeta cerca. Recalcula posición cada frame
 * (scroll/resize/layout async) y avisa `onMissingChange` cuando el elemento no
 * aparece, para que el motor entre en modo recuperación sin bloquear al usuario.
 */
export function SpotlightOverlay(props: Readonly<OverlayProps>) {
  const { step, onMissingChange } = props;
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardPos, setCardPos] = useState({ top: 0, left: 0 });

  const scrolledRef = useRef(false);
  const missingRef = useRef<boolean | null>(null);
  const startRef = useRef(0);
  const rectRef = useRef<Rect | null>(null);
  const posRef = useRef<{ top: number; left: number } | null>(null);

  useEffect(() => setMounted(true), []);

  // Reinicia el rastreo al cambiar de paso.
  useEffect(() => {
    scrolledRef.current = false;
    missingRef.current = null;
    rectRef.current = null;
    posRef.current = null;
    startRef.current =
      typeof performance !== "undefined" ? performance.now() : 0;
    setRect(null);
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

    const applyRect = (next: Rect | null) => {
      if (!rectEquals(rectRef.current, next)) {
        rectRef.current = next;
        setRect(next);
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

      if (!step.target) {
        report(false);
        applyRect(null);
        applyPos(centered(viewport));
      } else if (element) {
        report(false);
        if (!scrolledRef.current) {
          element.scrollIntoView?.({ block: "center", behavior: "smooth" });
          scrolledRef.current = true;
        }
        const box = element.getBoundingClientRect();
        const nextRect: Rect = {
          top: box.top,
          left: box.left,
          width: box.width,
          height: box.height,
        };
        applyRect(nextRect);
        const placement = resolvePlacement(
          nextRect,
          CARD_SIZE,
          viewport,
          step.position,
        );
        applyPos(placeTooltip(nextRect, CARD_SIZE, viewport, placement));
      } else {
        const elapsed =
          (typeof performance !== "undefined" ? performance.now() : 0) -
          startRef.current;
        const limit = step.waitForElement ? WAIT_TIMEOUT_MS : QUICK_TIMEOUT_MS;
        if (elapsed > limit) report(true);
        applyRect(null);
        applyPos(centered(viewport));
      }
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
    onMissingChange,
  ]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[100]"
      data-testid="tutorial-overlay"
    >
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-lg ring-2 ring-atlas-accent transition-[top,left,width,height] duration-150"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: "0 0 0 9999px rgba(15,16,26,0.55)",
          }}
        />
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "rgba(15,16,26,0.55)" }}
        />
      )}
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

function rectEquals(a: Rect | null, b: Rect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height
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
