import { redirect } from "next/navigation";
import { businessFlowsRedirect } from "@/features/processes/legacy-redirects";

/** «Procesos de negocio» se fusionó con Procesos; se conserva la ruta y su `?flow=`. */
export default async function BusinessFlowsRoute({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  redirect(businessFlowsRedirect(await searchParams));
}
