/**
 * Los iconos que la app trae, con el nombre que lee (`ICON_NAMES` en `ui/icons.tsx` de la app) y el
 * nombre que ve quien edita. El selector los DIBUJA (`icon-picker.tsx`): elegir por nombre obliga a
 * adivinar cómo se ve «chispa» o «etiqueta».
 *
 * Si se añade uno en la app hay que añadirlo aquí y en `app-icons-*.tsx`; si aquí se escribe uno que
 * la app no tiene, la app pinta el de por defecto en lugar de fallar.
 */
export const ICON_LABELS: Record<string, string> = {
  check: "Visto bueno",
  alerta: "Alerta",
  reloj: "Reloj",
  candado: "Candado",
  escudo: "Escudo",
  documento: "Documento",
  ayuda: "Ayuda",
  info: "Información",
  billetera: "Billetera",
  tendencia: "Tendencia",
  estrella: "Estrella",
  ojo: "Ojo",
  "ojo-tachado": "Ojo tachado",
  escanear: "Escanear",
  pagos: "Pagos",
  ubicacion: "Ubicación",
  camara: "Cámara",
  telefono: "Teléfono",
  sobre: "Sobre",
  chispa: "Chispa",
  comercio: "Comercio",
  etiqueta: "Etiqueta",
  grafico: "Gráfico",
  lista: "Lista",
  cuadricula: "Cuadrícula",
  educacion: "Educación",
  hogar: "Hogar",
  salud: "Salud",
  transporte: "Transporte",
  servicios: "Servicios",
  supermercado: "Supermercado",
  ropa: "Ropa",
  celulares: "Celulares",
  electronica: "Electrónica",
  inicio: "Inicio",
  perfil: "Perfil",
  asistente: "Asistente",
  refrescar: "Repetir",
  editar: "Editar",
  copiar: "Copiar",
  descargar: "Descargar",
  filtro: "Filtro",
  salir: "Salir",
  atras: "Atrás",
  adelante: "Adelante",
};

/** Tope del icono propio una vez procesado. Lo mismo que valida el servidor. */
export const MAX_ICON_BYTES = 32 * 1024;
