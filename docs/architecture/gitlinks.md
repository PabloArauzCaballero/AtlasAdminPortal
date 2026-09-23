# Referencias Git retiradas del portal

El commit `8b03c1c` agregó cuatro entradas de tipo `160000` sin `.gitmodules`.
Los directorios no contienen archivos versionados del portal y `git submodule status`
fallaba porque no había una definición para ellos. Se retiraron del índice con esta
clasificación:

| Ruta | Clasificación | Motivo |
| --- | --- | --- |
| `AtlasAdminPortal` | Artefacto de una copia anidada | Duplica este repositorio y no aporta código al build. |
| `Prompts` | Referencia sobrante a un repositorio independiente | El portal no importa archivos de [Prompts](https://github.com/PabloArauzCaballero/Prompts). |
| `bolivia-bank-statement-worker` | Referencia sobrante a un worker independiente | Su código y despliegue pertenecen a [su repositorio](https://github.com/PabloArauzCaballero/bolivia-bank-statement-worker); el portal no lo importa. |
| `semantic-analysis-worker` | Referencia sobrante a un worker independiente | Su código y despliegue pertenecen a [su repositorio](https://github.com/PabloArauzCaballero/semantic-analysis-worker); el portal no lo importa. |

Las exclusiones de TypeScript y ESLint para estas rutas siguen permitiendo clones
locales opcionales sin incorporarlos al build. Si alguna integración necesita un
worker, debe usar su contrato de servicio explícito y el CI de su propio repositorio.

El job de calidad ejecuta `git submodule status` para detectar futuras referencias
sin configuración. Para revisar el índice:

```bash
git ls-files --stage | awk '$1 == 160000 {print}'
git submodule status
```
