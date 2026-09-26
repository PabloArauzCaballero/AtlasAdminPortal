import { ExpedientePorClientePage } from "@/features/files/expediente-por-cliente-page";

export default async function ExpedientePorClienteRoute({
  params,
}: Readonly<{ params: Promise<{ customerId: string }> }>) {
  const { customerId } = await params;
  return <ExpedientePorClientePage customerId={customerId} />;
}
