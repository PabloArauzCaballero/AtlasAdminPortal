import { redirect } from "next/navigation";
import { processInstancesRedirect } from "@/features/processes/legacy-redirects";

/** Los casos de un proceso son ahora la pestaña «Casos en curso» de su ficha; se conserva `?caso=`. */
export default async function ProcessInstancesRoute({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const { code } = await params;
  redirect(processInstancesRedirect(code, await searchParams));
}
