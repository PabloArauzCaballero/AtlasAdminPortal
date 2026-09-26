"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { EmptyState, LoadingSkeleton } from "@/shared/components/ui/states";
import { useExpedientePorCliente } from "./hooks";

/**
 * Entrada al expediente por el id del CLIENTE, no por el del expediente.
 *
 * Existe para que otro producto pueda enlazar aquí. El Motor sabe de qué cliente es el caso que
 * está revisando; el id interno de su expediente no lo sabe ni tiene por qué —es un detalle de
 * este servicio, y hacerlo viajar obligaría a los dos lados a mantenerlo sincronizado—. Con esta
 * ruta el enlace se construye con lo único que ambos comparten.
 */
export function ExpedientePorClientePage({
  customerId,
}: Readonly<{ customerId: string }>) {
  return (
    <PermissionGate permissions={["expedientes.leer"]}>
      <Redireccion customerId={customerId} />
    </PermissionGate>
  );
}

function Redireccion({ customerId }: Readonly<{ customerId: string }>) {
  const router = useRouter();
  const expediente = useExpedientePorCliente(customerId);
  const expedienteId = expediente.data?.expedienteId;

  useEffect(() => {
    // `replace` y no `push`: esta pantalla es un desvío, y dejarla en el historial haría que el
    // botón de atrás rebotara de vuelta al expediente en un bucle.
    if (expedienteId) router.replace(`/internal/files/${expedienteId}`);
  }, [expedienteId, router]);

  if (expediente.isLoading) return <LoadingSkeleton rows={4} />;
  if (!expedienteId) {
    return (
      <EmptyState
        title="Este cliente todavía no tiene expediente."
        description="Se abre solo al empezar un onboarding. Los clientes anteriores a esta función necesitan el relleno histórico, que se lanza desde Jobs de runtime."
      />
    );
  }
  return <LoadingSkeleton rows={4} />;
}
