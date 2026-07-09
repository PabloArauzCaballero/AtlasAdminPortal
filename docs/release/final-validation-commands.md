# Comandos finales de validación

Ejecutar desde la raíz del frontend interno.

## Instalación limpia

```bash
rm -rf node_modules .next out dist coverage tsconfig.tsbuildinfo package-lock.json
npm install --ignore-scripts
```

En Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules,.next,out,dist,coverage -ErrorAction SilentlyContinue
Remove-Item -Force tsconfig.tsbuildinfo,package-lock.json -ErrorAction SilentlyContinue
npm install --ignore-scripts
```

## Validación completa

```bash
npm run validate
npm run build
npm audit --audit-level=high
```

## Comando único recomendado para CI

```bash
npm run clean && npm run validate && npm run build && npm audit --audit-level=high
```

## Comando equivalente con Yarn

```bash
yarn clean && yarn validate && yarn build && npm audit --audit-level=high
```

## Qué valida `npm run validate`

```txt
1. Ningún archivo TS/TSX de src supera 300 líneas.
2. No hay fetch directo fuera del cliente API.
3. No hay storage del navegador fuera del módulo de sesión.
4. No hay dangerouslySetInnerHTML.
5. El formato pasa con Prettier.
6. TypeScript strict pasa.
7. ESLint pasa.
```
