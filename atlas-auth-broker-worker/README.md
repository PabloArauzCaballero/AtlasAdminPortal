# atlas-auth-broker-worker

Worker especialista en **autenticación con proveedores externos**. Es el único componente del
ecosistema Atlas que toca material de credenciales: ni `AtlasBackend` ni `AtlasAdminPortal`
vuelven a leer un `*_CLIENT_SECRET`.

Cubre los dos sentidos de la autenticación:

- **Saliente** — cómo Atlas se autentica ante SEGIP, InfoCenter, Meta, WhatsApp, bancos y telcos.
- **Entrante** — federación de identidad: SSO corporativo para usuarios internos del portal y
  conexión social para clientes finales.

## Por qué existe

Antes de este worker, la autenticación saliente de Atlas era un conjunto de variables de entorno
declaradas en `PRODUCTION_CREDENTIAL_REQUIREMENTS`
(`AtlasBackend/src/modules/external-data/application/external-data-policy.util.ts`). Eso significa,
literalmente:

- Secretos en claro en el entorno de cada réplica del backend.
- Sin emisión ni renovación de tokens: el estado `PROVIDER_AUTH_FAILED` existía en el código pero
  nadie podía producirlo, porque no había ninguna llamada autenticada real.
- Sin rotación: una credencial comprometida seguía siendo válida hasta que alguien editara el
  despliegue.
- Sin visibilidad: el portal no distinguía "el proveedor está caído" de "nuestra credencial
  caducó" — dos incidentes con responsables y arreglos distintos.

Y la autenticación entrante federada no existía en absoluto: `AtlasBackend/src/modules/auth` solo
implementa contraseña, restablecimiento y segundo factor.

## Garantías

| Garantía                                               | Cómo se sostiene                                                                                                                                               |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los secretos nunca se guardan en claro                 | Cifrado de sobre AES-256-GCM: cada secreto lleva su propia DEK y solo la DEK se envuelve con la clave maestra (`infrastructure/crypto/envelope-encryption.ts`) |
| Los secretos nunca llegan al log                       | Redacción por nombre de campo **y** por forma del valor, no configurable (`observability/redacting-logger.ts`)                                                 |
| Los secretos nunca llegan al portal                    | El contrato `ProviderAuthState` solo publica huellas, fechas y códigos                                                                                         |
| El driver de desarrollo no puede usarse en producción  | La configuración se niega a arrancar con `vaultDriver=env` y `NODE_ENV=production`                                                                             |
| Ningún token viaja a punto de expirar                  | Renovación anticipada con margen configurable (`tokenRefreshSkewSeconds`)                                                                                      |
| Una ráfaga no dispara N peticiones de token            | Agrupación de peticiones en vuelo por proveedor (single-flight)                                                                                                |
| Una credencial incorrecta no bloquea la cuenta         | Los 4xx no se reintentan; solo los 5xx y los fallos de red                                                                                                     |
| Un `code` interceptado no sirve                        | PKCE S256 obligatorio; el `code_verifier` no sale del worker                                                                                                   |
| Un `id_token` de otro flujo no se reinyecta            | `nonce` obligatorio, atado a la autorización pendiente                                                                                                         |
| Una identidad social no autentica a un usuario interno | El `realm` viaja en la autorización pendiente, no en la query string                                                                                           |
| Rotar surte efecto inmediato                           | La rotación invalida el token cacheado del proveedor                                                                                                           |

## Estándares aplicados

- **RFC 6749** — OAuth 2.0 (`client_credentials`, código de autorización, `client_secret_basic`).
- **RFC 7636** — PKCE con `S256`; `plain` no se ofrece.
- **RFC 7523** — aserción de cliente JWT, para no enviar el secreto compartido por la red.
- **RFC 8705** — autenticación por certificado de cliente (mTLS) como método declarable.
- **OpenID Connect Core** — validación de `iss`, `aud`, `azp`, `exp`, `iat` y `nonce`.
- **NIST SP 800-57** — vida máxima de la credencial y rotación programada.

## API

Todas las rutas exigen `Authorization: Bearer <AUTH_BROKER_SERVICE_TOKEN>`, salvo `/health/live`.

### Saliente

| Método | Ruta                                         | Devuelve                                            |
| ------ | -------------------------------------------- | --------------------------------------------------- |
| `POST` | `/outbound/providers/:code/authorize`        | Cabeceras de autenticación para llamar al proveedor |
| `GET`  | `/outbound/providers/auth-state`             | Estado de autenticación de todos los proveedores    |
| `GET`  | `/outbound/providers/:code/auth-state`       | Estado de un proveedor                              |
| `GET`  | `/outbound/credentials/pending-rotation`     | Credenciales que exigen atención, por urgencia      |
| `POST` | `/outbound/providers/:code/rotate`           | Sella material nuevo e invalida el token            |
| `POST` | `/outbound/providers/:code/revoke`           | Revoca la credencial                                |
| `POST` | `/outbound/providers/:code/invalidate-token` | Fuerza la renovación en la próxima llamada          |

`authorize` es la única ruta que entrega material utilizable. Las demás son publicables.

### Entrante

| Método | Ruta                                 | Devuelve                          |
| ------ | ------------------------------------ | --------------------------------- |
| `GET`  | `/inbound/identity-providers?realm=` | Catálogo de IdP (sin `secretRef`) |
| `POST` | `/inbound/authorizations`            | URL de autorización + `state`     |
| `POST` | `/inbound/authorizations/callback`   | Identidad federada verificada     |

## Configuración

Ver [`.env.example`](./.env.example). Lo mínimo para arrancar en desarrollo:

```bash
AUTH_BROKER_SERVICE_TOKEN=<32+ caracteres>
AUTH_BROKER_VAULT_DRIVER=env
AUTH_BROKER_SECRET__PROVIDER_SEGIP__CLIENT_ID=...
AUTH_BROKER_SECRET__PROVIDER_SEGIP__CLIENT_SECRET=...
```

Los proveedores de identidad se declaran como JSON en `AUTH_BROKER_IDENTITY_PROVIDERS`:

```json
[
  {
    "idpCode": "CORPORATE_OIDC",
    "realm": "internal_sso",
    "issuer": "https://sso.empresa.example",
    "authorizationEndpoint": "https://sso.empresa.example/authorize",
    "tokenEndpoint": "https://sso.empresa.example/token",
    "jwksUri": "https://sso.empresa.example/jwks",
    "clientId": "atlas-portal",
    "redirectUri": "https://portal.atlas.example/internal/login/callback"
  }
]
```

## Comandos

```bash
yarn typecheck   # tsc --noEmit
yarn lint        # eslint
yarn test        # jest
yarn build       # tsc -p tsconfig.build.json
yarn validate    # todo lo anterior, en orden

yarn smoke:e2e   # prueba end-to-end contra el proceso real (requiere yarn build antes)
yarn verify      # build + smoke:e2e
```

## Verificación end-to-end

`scripts/e2e-smoke.mjs` no usa dobles de prueba del lado del broker: compila, arranca
`dist/src/standalone/worker-main.js` como proceso independiente y habla con él por HTTP real.
Enfrente levanta un proveedor/IdP autónomo con claves RSA reales que valida `client_secret_basic`,
exige PKCE `S256` comprobando el `code_verifier` contra el `code_challenge`, autentica a un usuario
con contraseña y firma el `id_token` con RS256 publicando su clave en un JWKS.

Cubre 37 comprobaciones en siete bloques: frontera del token de servicio, obtención y cacheo de
tokens salientes, rotación con secreto nuevo aceptado por el proveedor, revocación, inicio de
sesión completo de un usuario real por OIDC, defensas del flujo entrante (replay del `state`,
`state` desconocido, cruce de ámbitos) y ausencia de secretos en el log del proceso.

**Lo que esta prueba no cubre:** la conexión con SEGIP, InfoCenter o Meta reales. Eso exige
credenciales de producción y queda fuera a propósito.

## Límites conocidos

Están documentados en el código, en el punto exacto donde importan:

1. **Estado en memoria** (`infrastructure/memory/`). El catálogo de credenciales, las marcas de
   rotación/revocación y las autorizaciones OIDC en curso viven en el proceso. Con varias
   réplicas, un `callback` puede aterrizar en una instancia distinta de la que inició el flujo, y
   una revocación no sobrevive a un reinicio. Para escalar horizontalmente hay que respaldarlos
   (base de datos para las credenciales, Redis con TTL para las autorizaciones), conservando la
   semántica de un solo uso del `state`.
2. **El almacén de sobres cifrados es inyectable pero aún no está cableado a un KMS real**
   (`infrastructure/vault/envelope-secret-vault.adapter.ts`). La garantía criptográfica la aporta
   este worker; falta decidir e integrar el respaldo (AWS Secrets Manager, HashiCorp Vault u
   otro), lo que exige credenciales de infraestructura.
3. **Los proveedores que hoy solo declaran `BASE_URL`** (`QR_GENERIC`, `BANKING_GENERIC`,
   `TELCO_GENERIC`, `WHATSAPP_GENERIC`, `DIGITAL_TRUST_GENERIC`) se catalogan como `api_key` para
   que aparezcan como `MISSING` en vez de en verde. Su método real de autenticación se conocerá
   cuando exista integración real; hoy los adaptadores de AtlasBackend lanzan
   `*_REAL_INTEGRATION_NOT_CONFIGURED`.
