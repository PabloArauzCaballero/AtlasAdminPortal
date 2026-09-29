import { redirect } from "next/navigation";

/**
 * «Panel de control» se fusionó con Inicio (auditoría de duplicados del menú, 2026-09-29): los dos
 * leían `/systems/dashboard` y `/systems/health/tools`. La ruta se conserva para no romper
 * marcadores ni enlaces viejos.
 */
export default function SystemsDashboardRoute() {
  redirect("/internal");
}
