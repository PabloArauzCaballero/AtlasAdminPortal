import { redirect } from "next/navigation";
import {
  redirectTarget,
  type RedirectSearchParams,
} from "@/shared/lib/redirect-target";

/**
 * «Alertas» era la misma tabla (`data_quality_issues`) que «Issues de calidad», con otro nombre y un
 * «Reconocer» que cerraba sin motivo. Se fusionó en la bandeja de calidad; la ruta vieja redirige
 * con sus parámetros para no dejar 404 en marcadores ni enlaces.
 */
export default async function Page({
  searchParams,
}: Readonly<{ searchParams: Promise<RedirectSearchParams> }>) {
  redirect(redirectTarget("/internal/data-quality/issues", await searchParams));
}
