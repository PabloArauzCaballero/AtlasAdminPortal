import { redirect } from "next/navigation";

/** «Salud herramientas» es ahora la pestaña Salud de Herramientas; la ruta vieja lleva ahí. */
export default function ToolsHealthRoute() {
  redirect("/internal/systems/tools?tab=salud");
}
