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
import {
  DIM,
  DIM_SOFT,
  FullDim,
  SpotlightMask,
  type Spotlight,
} from "./spotlight-mask";
import { TutorialCard } from "./tutorial-card";
import type { EnginePhase } from "./tutorial-engine";
import type { TutorialStep } from "./types";

// Tamaño de arranque hasta que la tarjeta se mide de verdad (ResizeObserver).
const DEFAULT_CARD_SIZE: Size = { width: 352, height: 300 };
// Cuánto esperamos a que un elemento aparezca antes de decir «no lo encuentro».
// Tras navegar a la herramienta la página puede tardar en montar; se sigue
// buscando en cada frame, así que si aparece más tarde se resalta igual.
const WAIT_TIMEOUT_MS = 8_000;
const QUICK_TIMEOUT_MS = 4_000;

/**
 * Capa de spotlight: encuentra el target por `data-tutorial-id`, recorta su
 * rectángulo al viewport, lo resalta atenuando el resto y coloca la tarjeta
 * con su TAMAÑO REAL (medido) para que nunca tape el hueco ni se salga de la
 * pantalla. Recalcula cada frame y avisa `onMissingChange` si no aparece.
 */
export function SpotlightOverlay(props: Readonly<OverlayProps>) {
  const { step, phase, onMissingChange } = props;
  const [mounted, setMounted] = useState(false);
  const [spot, setSpot] = useState<Spotlight | null>(null);
  const [cardPos, setCardPos] = useState({ top: 0, left: 0 });
  const [cardSize, setCardSize] = useState<Size>(DEFAULT_CARD_SIZE);

  const cardRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);
  const missingRef = useRef<boolean | null>(null);
  const startRef = useRef(0);
  const spotRef = useRef<Spotlight | null>(null);
  const posRef = useRef<{ top: number; left: number } | null>(null);
  const sizeRef = useRef<Size>(DEFAULT_CARD_SIZE);

  useEffect(() => setMounted(true), []);

  // Mide la tarjeta: su alto cambia con el contenido (demos, ejemplos, avisos).
  useEffect(() => {
    const node = cardRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const box = node.getBoundingClientRect();
      const next = { width: box.width, height: box.height };
      if (
        next.width > 0 &&
        next.height > 0 &&
        (next.width !== sizeRef.current.width ||
          next.height !== sizeRef.current.height)
      ) {
        sizeRef.current = next;
        setCardSize(next);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [mounted]);

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
      const size = sizeRef.current;
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
            size,
            viewport,
            step.position,
          );
          applyPos(placeTooltip(clamped, size, viewport, placement));
          raf = window.requestAnimationFrame(tick);
          return;
        }
      }

      // Sin elemento visible: o esperamos una acción que lo revele (no es error),
      // o pasado un tiempo avisamos «no lo encuentro» con la salida a mano.
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
      applyPos(centered(viewport, size));
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

  // El velo bloquea los clics detrás del tutorial en los pasos que sólo
  // explican. Cuando se espera una acción del usuario NO bloquea: la acción
  // puede abrir un diálogo de confirmación o una fila fuera del hueco, y un velo
  // que los tapara dejaría al usuario sin poder hacer justo lo que se le pide.
  const awaiting = phase === "awaiting-action";
  const blocking = !awaiting;
  const dim = awaiting ? DIM_SOFT : DIM;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[100]"
      data-testid="tutorial-overlay"
      // Los diálogos del portal marcan `inert` al resto del body: esta capa se
      // exime porque guía al usuario también dentro de ellos (ver dialog-backdrop).
      data-atlas-above-dialogs=""
      data-card-size={`${Math.round(cardSize.width)}x${Math.round(cardSize.height)}`}
    >
      {spot ? (
        <SpotlightMask spot={spot} blocking={blocking} dim={dim} />
      ) : (
        <FullDim blocking={blocking} dim={dim} />
      )}
      <div
        ref={cardRef}
        className="absolute"
        style={{ top: cardPos.top, left: cardPos.left }}
      >
        <TutorialCard
          step={step}
          phase={phase}
          stepIndex={props.stepIndex}
          total={props.total}
          title={props.title}
          isLast={props.isLast}
          onNext={props.onNext}
          onPrev={props.onPrev}
          onSkipStep={props.onSkipStep}
          onSkipTutorial={props.onSkipTutorial}
          onClose={props.onClose}
          onLocate={props.onLocate}
          canLocate={props.canLocate}
        />
      </div>
    </div>,
    document.body,
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

function centered(viewport: Size, card: Size) {
  return {
    top: Math.max(16, viewport.height / 2 - card.height / 2),
    left: Math.max(16, viewport.width / 2 - card.width / 2),
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
  onLocate: () => void;
  canLocate: boolean;
  onMissingChange: (missing: boolean) => void;
};
