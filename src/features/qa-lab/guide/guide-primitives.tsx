"use client";

import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/cn";

export const SECTIONS = [
  { id: "panorama", num: "00", label: "Panorama" },
  { id: "antes", num: "01", label: "Antes de empezar" },
  { id: "escenarios", num: "02", label: "Escenarios y headers" },
  { id: "funcional", num: "03", label: "Prueba funcional" },
  { id: "stress", num: "04", label: "Prueba de stress" },
  { id: "journey", num: "05", label: "Journey encadenado" },
  { id: "seguridad", num: "06", label: "Guardarraíles" },
  { id: "historial", num: "07", label: "Historial" },
] as const;

export function GuideNav() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-25% 0px -65% 0px", threshold: 0 },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="hidden xl:block" aria-label="Índice de la guía">
      <div className="sticky top-[72px]">
        <p className="mb-3 pl-3 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-atlas-muted">
          En esta guía
        </p>
        <ul className="space-y-0.5">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={cn(
                  "flex items-baseline gap-2.5 rounded-md border-l-2 px-3 py-1.5 text-sm transition-colors",
                  active === section.id
                    ? "border-atlas-accent bg-atlas-accentSoft font-medium text-atlas-accent"
                    : "border-transparent text-atlas-muted hover:bg-atlas-soft hover:text-atlas-text",
                )}
              >
                <span className="font-mono text-[0.625rem] opacity-70">
                  {section.num}
                </span>
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export function Section({
  id,
  num,
  kicker,
  title,
  children,
}: Readonly<{
  id: string;
  num: string;
  kicker: string;
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <section id={id} className="scroll-mt-[76px]">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-atlas-accent">
        {num} · {kicker}
      </p>
      <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.015em] text-atlas-text md:text-2xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

type NoteTone = "tip" | "warning" | "critical";

export function Note({
  tone,
  tag,
  children,
}: Readonly<{ tone: NoteTone; tag: string; children: React.ReactNode }>) {
  const toneClass: Record<NoteTone, string> = {
    tip: "border-blue-200 bg-blue-50",
    warning: "border-amber-200 bg-amber-50",
    critical: "border-red-200 bg-red-50",
  };
  const tagClass: Record<NoteTone, string> = {
    tip: "text-blue-700",
    warning: "text-amber-700",
    critical: "text-red-700",
  };
  return (
    <div className={cn("flex gap-3 rounded-xl border p-4", toneClass[tone])}>
      <span
        className={cn(
          "shrink-0 pt-0.5 font-mono text-[0.625rem] font-bold uppercase tracking-[0.08em]",
          tagClass[tone],
        )}
      >
        {tag}
      </span>
      <div className="text-sm leading-6 text-atlas-text">{children}</div>
    </div>
  );
}

export function FeatureCard({
  icon,
  title,
  children,
  iconClass = "bg-atlas-accentSoft text-atlas-accent",
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  iconClass?: string;
}>) {
  return (
    <div className="rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
      <div
        className={cn(
          "mb-3 grid h-9 w-9 place-items-center rounded-lg",
          iconClass,
        )}
      >
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-atlas-text">{title}</h3>
      <p className="mt-1 text-[0.8125rem] leading-5 text-atlas-muted">
        {children}
      </p>
    </div>
  );
}

export function StepList({
  items,
}: Readonly<{ items: { title: string; body: React.ReactNode }[] }>) {
  return (
    <ol className="space-y-0">
      {items.map((item, index) => (
        <li key={item.title} className="relative pb-5 pl-14">
          <span className="absolute left-0 top-0 grid h-9 w-9 place-items-center rounded-lg bg-atlas-primary font-mono text-sm font-bold text-white">
            {index + 1}
          </span>
          {index < items.length - 1 ? (
            <span className="absolute left-[17px] top-9 h-[calc(100%-2.25rem)] w-px bg-atlas-border" />
          ) : null}
          <h3 className="mb-1 text-[0.9375rem] font-semibold text-atlas-text">
            {item.title}
          </h3>
          <p className="text-sm leading-6 text-atlas-muted">{item.body}</p>
        </li>
      ))}
    </ol>
  );
}
