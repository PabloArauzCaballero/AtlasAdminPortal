import { redirect } from "next/navigation";
import {
  redirectTarget,
  type RedirectSearchParams,
} from "@/shared/lib/redirect-target";

/**
 * «Formularios» enseñaba la misma tabla que ya está embebida en «Versiones de esquema»
 * (`AdminFormsTable`). Se quitó del menú; la ruta vieja redirige allí con sus parámetros.
 */
export default async function Page({
  searchParams,
}: Readonly<{ searchParams: Promise<RedirectSearchParams> }>) {
  redirect(redirectTarget("/internal/schema/versions", await searchParams));
}
