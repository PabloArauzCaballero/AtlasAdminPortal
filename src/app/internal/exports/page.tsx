import { redirect } from "next/navigation";

/**
 * «Exportaciones» era una lista fija de tres catálogos que enlazaba a sus pantallas. El botón
 * «Descargar JSON» vive ahora en la cabecera de Endpoints, Catálogo de datos y Reglas de calidad.
 */
export default function Page() {
  redirect("/internal/data-catalog/tables");
}
