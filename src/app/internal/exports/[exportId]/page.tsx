import { redirect } from "next/navigation";
import { exportDestination } from "@/features/data-exports/export-destinations";

/** Cada catálogo exportable lleva a la pantalla que ahora tiene su botón «Descargar JSON». */
export default async function Page({
  params,
}: Readonly<{ params: Promise<{ exportId: string }> }>) {
  const { exportId } = await params;
  redirect(exportDestination(exportId));
}
