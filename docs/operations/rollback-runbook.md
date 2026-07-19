# Runbook — incidentes y rollback

Guía operativa para responder a un incidente en el portal interno. Cubre lo que
es del **frontend y su pipeline**; los pasos específicos del hosting se marcan
como `[completar según hosting]` (Vercel/Coolify/etc.).

## 1. Triage rápido

1. **¿Es del frontend o del backend?** Un `AtlasApiError` con `status` 5xx y un
   `requestId` apunta al backend; una pantalla en blanco o un error de render
   apunta al frontend (lo captura `src/app/error.tsx` / `global-error.tsx`).
2. **Correlaciona con el `requestId`.** Los errores muestran el Request ID
   (`ErrorState`, boundary). Con ese ID se cruza el evento del cliente
   (observabilidad, FASE 18) con los logs del backend.
3. **¿Reciente?** Mira el último `push` a `main` y su run de CI. Si el incidente
   coincide con un deploy, es candidato a rollback.

## 2. Rollback

El deploy sale de `main`. Rollback = volver `main` (o el deploy) a un commit
sano y re-desplegar.

### Opción A — revertir el commit culpable (preferida)

No reescribe historia; deja rastro auditable.

```bash
git revert <sha-del-commit-malo>   # crea un commit que deshace el cambio
git push origin main               # dispara CI; si verde, re-deploy
```

- Para un rango: `git revert <viejo>..<nuevo>`.
- El CI (`ci.yml`) valida el revert antes de desplegar: si el revert rompe algo,
  no llega a producción.

### Opción B — re-desplegar el artefacto anterior (más rápido, sin tocar git)

`[completar según hosting]`: en el panel del hosting, promover el deploy
inmediatamente anterior (el que estaba en verde). Es lo más rápido para cortar el
sangrado; luego se hace la Opción A para dejarlo en git.

### Después del rollback

- Verifica el **smoke**: login carga (`e2e.yml`), una ruta lista, un 403 no cierra
  sesión, logout. `[completar: smoke automático contra el ambiente]`.
- Limpia caches si aplica `[completar según hosting/CDN]`.
- Las sesiones del cliente son cookie/sessionStorage; un rollback de frontend no
  las invalida por sí solo.

## 3. Qué NO hacer

- No `git push --force` sobre `main` para "quitar" el commit malo: rompe a los
  demás y pierde el rastro. Usa `git revert`.
- No desactivar el CI para "desbloquear" un deploy urgente. Usa la Opción B.

## 4. Acciones de seguridad ante compromiso

Si el incidente es una fuga de credenciales:

1. **Rotar** la credencial en el backend, revocar sesiones e invalidar refresh
   tokens (ver ADR 0007 / baseline).
2. **Purgar el historial** con `git filter-repo` si la credencial estuvo
   versionada; re-clonar en todos los equipos. Es destructivo: coordinarlo.
3. Confirmar que `gitleaks` (job `secrets`) no detecta la credencial en el árbol.

## 5. Post-incidente

- Registrar en un breve post-mortem: qué pasó, `requestId`/commit, cómo se
  detectó, cómo se mitigó, y qué gate faltó (¿un test? ¿un check de CI?).
- Si faltó cobertura, añadir el test que lo habría atrapado antes de cerrar.
