# ADR 0001 — Refresh de sesión coordinado (single-flight)

**Estado:** aceptado · **Fase:** 4

## Contexto

Cada respuesta 401 del backend disparaba su propio `refreshInternalSession`. Con
varias peticiones en vuelo a la vez (lo normal al cargar una pantalla), un token
expirado generaba N refresh en paralelo. Un test lo midió antes de tocar el
código: con 10 peticiones concurrentes se disparaban **10 refresh**
(`expected 10 to be 1`). Como el backend rota el refresh token en cada uso, esas
respuestas se pisan entre sí y la sesión puede quedar inconsistente. Además, cada
401 podía disparar su propio `location.replace` a login.

## Decisión

- `src/shared/api/refresh-coordinator.ts` mantiene **una sola promesa de refresh
  en vuelo**; las peticiones concurrentes esperan la misma. Se limpia en
  `finally` (también al fallar), para que un próximo 401 pueda reintentar en vez
  de quedar servido por una promesa ya rechazada.
- `src/shared/api/client.ts` añade un **lock de redirección**: solo la primera
  petición que agota el refresh redirige a login.
- Al terminar la sesión, `src/shared/auth/session-cache-guard.tsx` purga la cache
  de TanStack Query (`cancelQueries` + `clear`) y avisa a las demás pestañas por
  `BroadcastChannel` (el mensaje lleva solo `{ type }`, nunca tokens).

## Consecuencias

- Un solo refresh y un solo redirect ante N peticiones caducadas.
- La purga de cache corre solo en la transición «había sesión → ya no»: estando
  deslogueado, cada petición vuelve a emitir `null` y purgar en todas tiraría la
  cache constantemente.
- El aviso entre pestañas usa un flag de origen remoto para no reemitirse y
  provocar un ping-pong infinito.
