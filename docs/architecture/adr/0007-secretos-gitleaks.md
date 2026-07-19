# ADR 0007 — Contención de secretos con gitleaks

**Estado:** aceptado · **Fase:** 1

## Contexto

`.env.example` (archivo **versionado**) contenía un correo y una contraseña con
apariencia real. Aunque fueran de prueba, deben tratarse como comprometidos.

## Decisión

- Los valores se sustituyeron por placeholders inertes (`TEST_*`) con
  instrucción de usar `.env.local` (ignorado).
- `.gitleaks.toml` con reglas por defecto + una regla propia para credenciales en
  texto plano dentro de archivos `.env*`. El job `secrets` del CI corre
  `gitleaks detect --no-git` sobre el árbol de trabajo (sin `node_modules`, así
  termina en segundos).
- Se verificó con dos fixtures: árbol limpio → sin fugas; credencial
  reintroducida → detectada. Durante esa verificación se encontró y corrigió un
  bug: el patrón `path` con prefijo `(^|/)` **nunca disparaba en Windows** (usa
  `\`); se usa un patrón agnóstico al separador.

## Consecuencias

- Una credencial nueva en un `.env*` versionado rompe el CI.
- **Pendiente manual (no automatizable), documentado en el baseline:** rotar la
  credencial en el backend e **purgar el historial de git** (`git filter-repo`).
  Retirarla del archivo no la invalida ni la borra de commits anteriores; el
  escaneo `--no-git` cubre el árbol de trabajo, no el historial.
