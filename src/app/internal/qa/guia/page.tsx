import { redirect } from "next/navigation";

/** «Guía QA Lab» es ahora la pestaña «Guía de referencia» de Aprender QA Lab. */
export default function QaLabGuiaRoute() {
  redirect("/internal/qa/aprender?tab=guia");
}
