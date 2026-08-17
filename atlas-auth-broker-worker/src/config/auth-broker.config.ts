import { z } from 'zod';

/** Acepta únicamente `true`/`false` explícitos: un valor mal escrito debe fallar, no asumirse. */
function booleanFromEnvironment(defaultValue: boolean): z.ZodType<boolean, string | undefined> {
  return z
    .enum(['true', 'false'])
    .default(defaultValue ? 'true' : 'false')
    .transform((value) => value === 'true');
}

const vaultDriverSchema = z.enum(['env', 'kms']);

export type VaultDriver = z.infer<typeof vaultDriverSchema>;

export const authBrokerConfigSchema = z
  .object({
    port: z.number().int().min(0).max(65_535).default(3020),
    shutdownTimeoutSeconds: z.number().int().min(1).max(300).default(15),

    /**
     * Token de servicio que AtlasBackend presenta en `authorization: Bearer`. 32 caracteres es el
     * mínimo razonable para un secreto de 128+ bits en base64url; por debajo, el broker no arranca.
     */
    serviceToken: z.string().min(32),

    vaultDriver: vaultDriverSchema.default('env'),
    /** Clave maestra de envoltura en base64 (32 bytes = AES-256). Solo para el driver `kms` local. */
    masterKeyBase64: z.string().optional(),

    /**
     * Siembra el vault cifrado con los secretos presentes en el entorno al arrancar.
     *
     * Es la ruta de migración desde el modelo actual de AtlasBackend, donde las credenciales ya
     * viven en variables de entorno: permite pasar al vault cifrado sin un corte de servicio.
     * Por defecto está apagado y, cuando se activa, el worker lo registra como advertencia — una
     * vez sembrado, esas variables deben retirarse del despliegue.
     */
    seedSecretsFromEnv: z.boolean().default(false),

    credentialMaxAgeDays: z.number().int().min(1).max(3_650).default(90),
    rotationWarningDays: z.number().int().min(0).max(365).default(14),

    tokenRefreshSkewSeconds: z.number().int().min(0).max(3_600).default(60),
    tokenRequestTimeoutMs: z.number().int().min(500).max(60_000).default(8_000),
    tokenMaxRetries: z.number().int().min(0).max(5).default(2),

    authorizationTtlSeconds: z.number().int().min(30).max(3_600).default(600),

    isProduction: z.boolean().default(false),
  })
  .superRefine((config, context) => {
    if (config.rotationWarningDays >= config.credentialMaxAgeDays) {
      context.addIssue({
        code: 'custom',
        path: ['rotationWarningDays'],
        message:
          'rotationWarningDays debe ser menor que credentialMaxAgeDays: avisar de la rotación después de que la credencial ya venció no deja margen para rotarla.',
      });
    }
    // El driver `env` guarda los secretos en variables de entorno en claro, legibles por cualquier
    // proceso del contenedor y por cualquiera que inspeccione la definición del despliegue. Es
    // aceptable en desarrollo y nunca en producción, así que el proceso se niega a arrancar.
    if (config.isProduction && config.vaultDriver === 'env') {
      context.addIssue({
        code: 'custom',
        path: ['vaultDriver'],
        message:
          'En producción el driver del vault no puede ser `env`: los secretos de proveedor quedarían en variables de entorno en claro. Use AUTH_BROKER_VAULT_DRIVER=kms.',
      });
    }
    if (config.vaultDriver === 'kms' && !config.masterKeyBase64) {
      context.addIssue({
        code: 'custom',
        path: ['masterKeyBase64'],
        message:
          'El driver `kms` necesita una clave maestra de envoltura (AUTH_BROKER_MASTER_KEY_BASE64 en local, o el CMK inyectado por el gestor de secretos).',
      });
    }
  });

export type AuthBrokerConfig = z.infer<typeof authBrokerConfigSchema>;

const environmentSchema = z.object({
  NODE_ENV: z.string().default('development'),
  AUTH_BROKER_PORT: z.coerce.number().int().default(3020),
  AUTH_BROKER_SHUTDOWN_TIMEOUT_SECONDS: z.coerce.number().int().default(15),
  AUTH_BROKER_SERVICE_TOKEN: z.string().default(''),
  AUTH_BROKER_VAULT_DRIVER: vaultDriverSchema.default('env'),
  AUTH_BROKER_MASTER_KEY_BASE64: z.string().optional(),
  AUTH_BROKER_SEED_SECRETS_FROM_ENV: booleanFromEnvironment(false),
  AUTH_BROKER_CREDENTIAL_MAX_AGE_DAYS: z.coerce.number().int().default(90),
  AUTH_BROKER_ROTATION_WARNING_DAYS: z.coerce.number().int().default(14),
  AUTH_BROKER_TOKEN_REFRESH_SKEW_SECONDS: z.coerce.number().int().default(60),
  AUTH_BROKER_TOKEN_REQUEST_TIMEOUT_MS: z.coerce.number().int().default(8_000),
  AUTH_BROKER_TOKEN_MAX_RETRIES: z.coerce.number().int().default(2),
  AUTH_BROKER_AUTHORIZATION_TTL_SECONDS: z.coerce.number().int().default(600),
  AUTH_BROKER_STRICT_TRANSPORT: booleanFromEnvironment(true),
});

/**
 * Convierte variables de entorno en configuración validada.
 *
 * Falla al arrancar, no en la primera request: un broker de credenciales mal configurado que
 * arranca "a medias" es peor que uno que no arranca, porque el fallo aparece en la primera
 * verificación de identidad de un cliente real.
 */
export function loadAuthBrokerConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AuthBrokerConfig {
  const parsed = environmentSchema.parse(environment);

  return authBrokerConfigSchema.parse({
    port: parsed.AUTH_BROKER_PORT,
    shutdownTimeoutSeconds: parsed.AUTH_BROKER_SHUTDOWN_TIMEOUT_SECONDS,
    serviceToken: parsed.AUTH_BROKER_SERVICE_TOKEN,
    vaultDriver: parsed.AUTH_BROKER_VAULT_DRIVER,
    ...(parsed.AUTH_BROKER_MASTER_KEY_BASE64
      ? { masterKeyBase64: parsed.AUTH_BROKER_MASTER_KEY_BASE64 }
      : {}),
    seedSecretsFromEnv: parsed.AUTH_BROKER_SEED_SECRETS_FROM_ENV,
    credentialMaxAgeDays: parsed.AUTH_BROKER_CREDENTIAL_MAX_AGE_DAYS,
    rotationWarningDays: parsed.AUTH_BROKER_ROTATION_WARNING_DAYS,
    tokenRefreshSkewSeconds: parsed.AUTH_BROKER_TOKEN_REFRESH_SKEW_SECONDS,
    tokenRequestTimeoutMs: parsed.AUTH_BROKER_TOKEN_REQUEST_TIMEOUT_MS,
    tokenMaxRetries: parsed.AUTH_BROKER_TOKEN_MAX_RETRIES,
    authorizationTtlSeconds: parsed.AUTH_BROKER_AUTHORIZATION_TTL_SECONDS,
    isProduction: parsed.NODE_ENV === 'production',
  });
}
