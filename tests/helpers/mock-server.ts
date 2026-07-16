import { setupServer } from "msw/node";

/**
 * Servidor MSW compartido: los tests registran sus handlers con `server.use(...)`.
 * Se arranca solo en los tests que lo necesitan (no en el setup global) para no
 * interceptar el fetch de los tests que lo stubean directamente.
 */
export const server = setupServer();

export const API_BASE = "https://api.test/api/v1";
export const SESSION_STORAGE_KEY = "atlas_internal_session_v3";
