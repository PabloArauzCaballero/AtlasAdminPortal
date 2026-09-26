/**
 * Contratos de entrada del API del broker.
 *
 * Todo lo que entra por HTTP se valida aquí antes de tocar un servicio. En un proceso que
 * custodia credenciales, un cuerpo sin validar es la vía directa a rotar el proveedor equivocado
 * o a sellar material vacío.
 */
import { z } from 'zod';
import { SECRET_FIELDS } from '../infrastructure/vault/secret-ref';

/** Los códigos de proveedor de Atlas son mayúsculas, dígitos y guion bajo. */
export const providerCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[A-Z0-9_]+$/u, 'El código de proveedor solo admite mayúsculas, dígitos y guion bajo.');

export const idpCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(
    /^[A-Z0-9_]+$/u,
    'El código de proveedor de identidad solo admite mayúsculas, dígitos y guion bajo.',
  );

export const federationRealmSchema = z.enum(['internal_sso', 'customer_social']);

const rotatableFields = [
  SECRET_FIELDS.clientId,
  SECRET_FIELDS.clientSecret,
  SECRET_FIELDS.apiKey,
  SECRET_FIELDS.privateKey,
] as const;

export const rotateCredentialSchema = z.object({
  field: z.enum(rotatableFields),
  /**
   * Material nuevo. El mínimo de 8 caracteres no pretende medir entropía —un secreto de
   * proveedor tiene el formato que el proveedor decida—, solo descartar el error de pegar un
   * valor truncado o vacío, que dejaría al proveedor inalcanzable sin que nadie lo notara hasta
   * la primera verificación real.
   */
  material: z.string().min(8).max(8_192),
});

export const revokeCredentialSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const beginAuthorizationSchema = z.object({
  idpCode: idpCodeSchema,
  realm: federationRealmSchema.optional(),
});

export const completeAuthorizationSchema = z.object({
  state: z.string().min(16).max(512),
  code: z.string().min(1).max(4_096),
  realm: federationRealmSchema.optional(),
});

export type RotateCredentialInput = z.infer<typeof rotateCredentialSchema>;
export type RevokeCredentialInput = z.infer<typeof revokeCredentialSchema>;
export type BeginAuthorizationInput = z.infer<typeof beginAuthorizationSchema>;
export type CompleteAuthorizationInput = z.infer<typeof completeAuthorizationSchema>;
