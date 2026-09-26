/**
 * La subida al almacén (MinIO) pasa por ESTE origen, no directo.
 *
 * El permiso firmado trae la dirección pública del almacén, que es otro origen: en TEST
 * `http://minio.161.97.85.216.sslip.io` mientras el portal se sirve por https. El navegador lo
 * bloqueaba dos veces —la CSP del portal sólo deja `connect-src 'self'` y, además, es contenido
 * mixto— y `*.sslip.io` lo corta el filtro web de la red de Pablo. Por eso el navegador sube a
 * `/almacen/subida` con el permiso en una cabecera y el servidor de Next da el salto
 * (`src/app/almacen/subida/route.ts`). Mismo arreglo que en el ERP (AtlasERPFrontend #11).
 */
export const RUTA_SUBIDA_AL_ALMACEN = "/almacen/subida";
export const CABECERA_DESTINO = "x-almacen-destino";
