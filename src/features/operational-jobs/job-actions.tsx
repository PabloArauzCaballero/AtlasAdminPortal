"use client";

/**
 * Lo que se puede hacer con una corrida: mirarla.
 *
 * Aquí había «Reintentar» y «Cancelar» con un diálogo que prometía «quedará auditada». Las rutas
 * a las que llamaban (`/internal/jobs/:id/retry|cancel`) las retiró AtlasBackend porque devolvían
 * 200 sin hacer nada; el portal nunca quitó los botones y pasaron a dar 404. Una corrida es un
 * hecho: se relanza el JOB (un disparo nuevo con su propia auditoría desde `operations/jobs`),
 * no la corrida.
 */
export function JobActions({ jobRunId }: Readonly<{ jobRunId: string }>) {
  return (
    <p
      className="max-w-md text-sm text-atlas-muted"
      data-testid="job-actions-note"
      data-job-run-id={jobRunId}
    >
      Una corrida no se reintenta ni se cancela desde aquí: es el registro de lo
      que pasó. Para volver a ejecutar el proceso se dispara el job de nuevo
      desde Operaciones, y queda como una corrida nueva.
    </p>
  );
}
