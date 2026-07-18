import Link from "next/link";

/** 404 a nivel de aplicación: mantiene la identidad y ofrece la vuelta al portal. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-atlas-bg p-8 text-center">
      <p className="font-mono text-sm tracking-widest text-atlas-accent">
        ERROR 404
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-atlas-text">
        No encontramos esta página
      </h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-atlas-muted">
        La ruta no existe o fue movida. Revisa el enlace o vuelve al inicio del
        portal interno.
      </p>
      <Link
        href="/internal"
        className="mt-6 rounded-lg bg-atlas-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
      >
        Volver al portal
      </Link>
    </main>
  );
}
