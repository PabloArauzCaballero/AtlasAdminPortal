# Movido: Atlas External Providers Mock

Esta carpeta era la fase intermedia del mock de proveedores externos. El servidor
se migró a su propio repositorio, estructurado como un backend independiente:

```
../../AtlasExternalProvidersMock
```

Levantarlo:

```bash
cd ../../AtlasExternalProvidersMock
npm start        # http://localhost:4010
npm test         # tests de contrato con AtlasBackend
```

`AtlasBackend` conserva el atajo `yarn mock:providers`, que apunta al repo nuevo.
No agregar código acá — cualquier cambio de emuladores/escenarios va en
`AtlasExternalProvidersMock/src/providers/` con su fila en `test/contract.test.mjs`.
