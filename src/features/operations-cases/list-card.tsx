"use client";

/**
 * Una lista corta con título, y con un vacío que DICE algo.
 *
 * El `empty` no es adorno: en una investigación, «sin consentimientos registrados» y una lista que
 * no llegó a cargar se ven igual si el hueco se deja en blanco, y son cosas opuestas a la hora de
 * decidir un caso.
 */
export function ListCard({
  title,
  empty,
  children,
}: Readonly<{ title: string; empty: string; children: React.ReactNode }>) {
  const hasChildren = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);
  return (
    <section className="rounded-2xl border border-atlas-border bg-white shadow-subtle">
      <div className="border-b border-atlas-border bg-slate-50/70 px-5 py-3">
        <h2 className="text-sm font-semibold text-atlas-text">{title}</h2>
      </div>
      <div className="p-5">
        {hasChildren ? (
          <ul className="divide-y divide-slate-100">{children}</ul>
        ) : (
          <p className="text-sm text-atlas-muted">{empty}</p>
        )}
      </div>
    </section>
  );
}
