import { emptyTexts } from "@/shared/lib/empty-texts";

/** Qué decir cuando no hay perfiles de carga, o cuando los filtros no dejan pasar ninguno. */
export function perfilesVacios(filtered: boolean) {
  return emptyTexts({
    filtered,
    noMatchTitle: "Ningún perfil de carga coincide con los filtros.",
    empty: {
      title: "Todavía no hay perfiles de carga.",
      description:
        "Un perfil define cuánta carga se lanza contra una ruta; sin perfil no se puede lanzar una corrida de carga.",
    },
  });
}

/** Ídem para la matriz de cobertura (rutas que necesitan prueba de carga). */
export function matrizVacia(filtered: boolean) {
  return emptyTexts({
    filtered,
    noMatchTitle: "Ninguna ruta coincide con tu búsqueda.",
    empty: {
      title: "No hay rutas que necesiten prueba de carga.",
      description:
        "Aquí se listan las rutas que requieren prueba de carga y si tienen un perfil habilitado.",
    },
  });
}
