import { redirect } from "next/navigation";

/** «Jobs de runtime» es ahora la pestaña «Ejecutar ahora» de Jobs. */
export default function Page() {
  redirect("/internal/jobs?tab=ejecutar");
}
