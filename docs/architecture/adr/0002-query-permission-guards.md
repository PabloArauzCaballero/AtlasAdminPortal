# ADR 0002 — El PermissionGate envuelve a un componente `Authorized*`

**Estado:** aceptado · **Fase:** 6

## Contexto

`PermissionGate` solo decide al renderizar. Pero en 58 componentes los hooks de
datos se ejecutaban en el mismo cuerpo, **antes** del `return` que monta el gate.
Resultado: la petición ya había salido cuando el gate bloqueaba. Un usuario sin
permiso disparaba igual las queries — incluidas las de datos personales en
`pii-registry-page`. Ocultar la UI no es autorizar.

## Decisión

El patrón obligatorio es que el gate envuelva a un **componente hijo** donde
viven los hooks:

```tsx
export function XPage() {
  return (
    <PermissionGate permissions={["..."]}>
      <AuthorizedXPage />
    </PermissionGate>
  );
}

function AuthorizedXPage() {
  const data = useAlgo(); // no se ejecuta hasta que el gate autoriza
  return <>...</>;
}
```

La migración de los 58 componentes se hizo con un **codemod sobre el AST** (54
automáticos + 2 a mano donde el gate no era la raíz del return).

## Consecuencias

- Cero peticiones antes de autorizar (verificado con un test que cuenta las
  requests: contra el código viejo salían 2 de PII sin permiso; ahora 0).
- Los **gates anidados** que envuelven una acción concreta (p. ej. el botón
  «Nueva plantilla» con `fallback={null}`) se conservan: son _Action Guards_
  correctos y sus queries ya viven dentro del gate de la página.
- Pendiente: el backend sigue siendo la autoridad final; este patrón evita la
  fuga en el cliente, no reemplaza la verificación server-side.
