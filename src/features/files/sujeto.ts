/**
 * Cómo se nombra a quién pertenece el expediente.
 *
 * Un expediente puede ser de una persona, de un comercio o de un reclamo, y los textos de la
 * pantalla hablaban siempre «del cliente»: en la carpeta de un comercio eso hace dudar de si se
 * abrió la correcta.
 */
export type TextosDelSujeto = {
  /** La frase de la cabecera: «Todo lo que se subió … sobre ___». */
  descripcion: string;
  /** Lo que se dice en una carpeta vacía: qué llega aquí solo. */
  carpetaVacia: string;
};

const TEXTOS: Record<string, TextosDelSujeto> = {
  customer: {
    descripcion:
      "Todo lo que se subió, se generó o se revisó sobre esta persona, en un solo sitio.",
    carpetaVacia:
      "Lo que suba el cliente y lo que deje el Motor aparecerá aquí sin que nadie lo mueva a mano.",
  },
  partner: {
    descripcion:
      "Todo lo que se subió, se generó o se revisó sobre este comercio, en un solo sitio.",
    carpetaVacia:
      "Sus QR de cobro, el poder de su representante y los documentos de su cuenta en el ERP aparecerán aquí sin que nadie los mueva a mano.",
  },
  claim: {
    descripcion:
      "Todo lo que se subió, se generó o se revisó sobre este reclamo, en un solo sitio.",
    carpetaVacia:
      "Lo que se adjunte al reclamo aparecerá aquí sin que nadie lo mueva a mano.",
  },
};

const GENERICO: TextosDelSujeto = {
  descripcion:
    "Todo lo que se subió, se generó o se revisó sobre este expediente, en un solo sitio.",
  carpetaVacia:
    "Lo que se añada a este expediente aparecerá aquí sin que nadie lo mueva a mano.",
};

export function textosDelSujeto(subjectType: string): TextosDelSujeto {
  return TEXTOS[subjectType] ?? GENERICO;
}
