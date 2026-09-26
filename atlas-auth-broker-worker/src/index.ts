/**
 * Superficie pública del worker.
 *
 * Se exportan el dominio y los servicios —para poder acoplar el broker dentro de otro proceso
 * Node— pero NINGUNA utilidad que abra material: `openSecret` y los adaptadores de vault quedan
 * fuera a propósito, para que consumir este paquete no sea una vía de acceso a los secretos.
 */
export type {
  AccessTokenStatus,
  CredentialStatus,
  FederatedIdentity,
  FederationRealm,
  IdentityProviderConfig,
  ProviderAuthMethod,
  ProviderAuthState,
  ProviderCredential,
} from './domain/auth-broker.types';

export { AuthBrokerError, isAuthBrokerError } from './domain/auth-broker.errors';
export type { AuthBrokerErrorCode } from './domain/auth-broker.errors';

export { TokenBrokerService } from './application/outbound/token-broker.service';
export type { ProviderAuthorization } from './application/outbound/token-broker.service';
export { CredentialHealthService } from './application/outbound/credential-health.service';
export { CredentialRotationService } from './application/outbound/credential-rotation.service';
export { FederatedLoginService } from './application/inbound/federated-login.service';

export { composeAuthBroker } from './auth-broker.composition';
export type { ComposedBroker, CompositionOverrides } from './auth-broker.composition';
export { createAuthBrokerServer } from './infrastructure/http/auth-broker.http-server';
export type { AuthBrokerServices } from './infrastructure/http/auth-broker.http-server';
export { loadAuthBrokerConfig } from './config/auth-broker.config';
export type { AuthBrokerConfig } from './config/auth-broker.config';
