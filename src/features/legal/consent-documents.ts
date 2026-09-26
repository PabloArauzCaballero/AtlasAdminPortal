/**
 * @file Lectura pública de los documentos legales publicados, para servirlos como página web.
 * @business Apple y Google exigen una URL pública y permanente de la política de privacidad antes de
 *   admitir la app en TestFlight o en la tienda. El texto ya vivía en la base —es el mismo que firma
 *   el cliente durante el alta—, pero sólo se servía como JSON dentro del onboarding: no había nada
 *   que pegar en un formulario de revisión. Estas páginas publican ESE mismo texto, de modo que la
 *   versión que lee el revisor y la que acepta el cliente no puedan divergir.
 * @system Server components sin caché: el documento vigente lo decide el backend, y una versión
 *   nueva tiene que verse en la web en cuanto se publica, no en el siguiente despliegue del portal.
 */
import { rawFetch } from "@/shared/api/transport";

/** Una página legal no puede colgarse esperando: el revisor cierra antes que el timeout por defecto. */
const LECTURA_TIMEOUT_MS = 8_000;

/** Un documento legal vigente tal como lo devuelve `GET /consent-documents/active`. */
export type ConsentDocument = {
  documentCode: string;
  versionCode: string;
  language: string;
  title: string;
  summary: string | null;
  bodyMarkdown: string | null;
  contentUrl: string | null;
};

/**
 * Origen del backend para las llamadas de SERVIDOR.
 *
 * `NEXT_PUBLIC_API_BASE_URL` no sirve aquí: en producción vale `/api/v1` —una ruta relativa pensada
 * para el navegador, que el propio Next reescribe—. Un `fetch` de servidor con una URL relativa no
 * tiene contra qué resolverla. Se usa el mismo origen interno que alimenta esa reescritura.
 */
function internalApiOrigin(): string {
  const configured = process.env.INTERNAL_API_ORIGIN?.trim();
  return (
    configured && configured.length > 0 ? configured : "http://127.0.0.1:3005"
  ).replace(/\/$/, "");
}

function tenantId(): string {
  const configured = process.env.ATLAS_PUBLIC_LEGAL_TENANT_ID?.trim();
  return configured && configured.length > 0 ? configured : "1";
}

/**
 * Documentos vigentes para un idioma. Devuelve lista vacía si el backend no responde.
 *
 * No propaga el error a propósito: una página legal que devuelve 500 porque el API está reiniciando
 * es, para el revisor de una tienda, una política de privacidad que «no existe» — y eso es un
 * rechazo. Vale más una página que explica que el documento no está disponible.
 */
export async function fetchActiveDocuments(
  language = "es",
): Promise<ConsentDocument[]> {
  const url = `${internalApiOrigin()}/api/v1/consent-documents/active?language=${encodeURIComponent(language)}`;
  try {
    /*
      Se usa `rawFetch` del transporte compartido, no el cliente de API del portal: éste adjunta la
      sesión del operador, y aquí no hay ninguna — la ruta es pública y el endpoint también.
    */
    const response = await rawFetch(
      url,
      {
        headers: { "x-tenant-id": tenantId(), accept: "application/json" },
        cache: "no-store",
      },
      LECTURA_TIMEOUT_MS,
    );
    if (!response.ok) return [];
    const payload: unknown = await response.json();
    const data = (payload as { data?: unknown })?.data;
    return Array.isArray(data) ? (data as ConsentDocument[]) : [];
  } catch {
    return [];
  }
}

export async function fetchDocument(
  documentCode: string,
  language = "es",
): Promise<ConsentDocument | null> {
  const documents = await fetchActiveDocuments(language);
  return (
    documents.find((document) => document.documentCode === documentCode) ?? null
  );
}

/** Rótulo humano de cada código, para el índice y el título de la pestaña. */
export const DOCUMENT_LABELS: Record<string, string> = {
  privacy_policy: "Política de privacidad",
  terms_of_service: "Términos y condiciones",
  credit_bureau_query: "Consulta de historial crediticio",
  device_address_book: "Uso de tus contactos",
  location_tracking: "Uso de tu ubicación",
  marketing_communications: "Comunicaciones comerciales",
};
