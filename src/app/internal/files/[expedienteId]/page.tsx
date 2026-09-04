import { ExpedientePage } from "@/features/files/expediente-page";

export default async function ExpedienteRoute({
  params,
}: Readonly<{ params: Promise<{ expedienteId: string }> }>) {
  const { expedienteId } = await params;
  return <ExpedientePage expedienteId={expedienteId} />;
}
