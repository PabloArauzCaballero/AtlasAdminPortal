/**
 * Federación de identidad entrante: SSO corporativo para usuarios internos y conexión social para
 * clientes finales, sobre el mismo flujo de código de autorización con PKCE.
 *
 * Los dos ámbitos comparten mecanismo pero NO confianza. Un `id_token` emitido por el IdP social
 * de un cliente jamás puede acabar autenticando a un usuario interno del portal, así que el
 * `realm` viaja en la autorización pendiente —material que el navegador no controla— y se
 * compara al completar. Confiar en un `realm` que llegue por query string sería equivalente a no
 * separarlos.
 */
import { AuthBrokerError } from '../../domain/auth-broker.errors';
import type {
  FederatedIdentity,
  FederationRealm,
  IdentityProviderConfig,
  PendingAuthorization,
} from '../../domain/auth-broker.types';
import type { AuthorizationCodeClient } from '../../infrastructure/http/authorization-code.client';
import type { IdTokenVerifier } from '../../infrastructure/crypto/id-token.verifier';
import { createNonce, createPkcePair, createState } from '../../infrastructure/crypto/pkce';
import { SECRET_FIELDS } from '../../infrastructure/vault/secret-ref';
import type {
  AuthBrokerLogger,
  AuthorizationStore,
  Clock,
  IdentityProviderRegistry,
  SecretVault,
} from '../ports';

export type BeginAuthorizationResult = {
  readonly authorizationUrl: string;
  readonly state: string;
  readonly expiresAt: string;
  readonly realm: FederationRealm;
};

export type FederatedLoginDependencies = {
  readonly identityProviders: IdentityProviderRegistry;
  readonly authorizations: AuthorizationStore;
  readonly codeClient: AuthorizationCodeClient;
  readonly idTokenVerifier: IdTokenVerifier;
  readonly vault: SecretVault;
  readonly clock: Clock;
  readonly logger: AuthBrokerLogger;
  readonly authorizationTtlSeconds: number;
};

export class FederatedLoginService {
  constructor(private readonly dependencies: FederatedLoginDependencies) {}

  /** Inicia una autorización y devuelve la URL a la que redirigir al navegador. */
  async begin(idpCode: string, expectedRealm?: FederationRealm): Promise<BeginAuthorizationResult> {
    const idp = await this.requireIdentityProvider(idpCode);
    if (expectedRealm !== undefined && idp.realm !== expectedRealm) {
      throw new AuthBrokerError(
        'AUTHORIZATION_REALM_MISMATCH',
        `El proveedor ${idpCode} pertenece a otro ámbito de confianza.`,
        { idpCode, realm: idp.realm },
      );
    }

    const now = this.dependencies.clock.now();
    const pkce = createPkcePair();
    const pending: PendingAuthorization = {
      state: createState(),
      nonce: createNonce(),
      codeVerifier: pkce.codeVerifier,
      idpCode: idp.idpCode,
      realm: idp.realm,
      redirectUri: idp.redirectUri,
      createdAt: now,
      expiresAt: now + this.dependencies.authorizationTtlSeconds * 1_000,
    };
    await this.dependencies.authorizations.save(pending);

    const url = new URL(idp.authorizationEndpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', idp.clientId);
    url.searchParams.set('redirect_uri', idp.redirectUri);
    url.searchParams.set('scope', idp.scopes.join(' '));
    url.searchParams.set('state', pending.state);
    url.searchParams.set('nonce', pending.nonce);
    url.searchParams.set('code_challenge', pkce.codeChallenge);
    url.searchParams.set('code_challenge_method', pkce.codeChallengeMethod);

    this.dependencies.logger.info('federated_authorization_started', {
      idpCode: idp.idpCode,
      realm: idp.realm,
    });

    return {
      authorizationUrl: url.toString(),
      state: pending.state,
      expiresAt: new Date(pending.expiresAt).toISOString(),
      realm: idp.realm,
    };
  }

  /** Completa la autorización: canjea el código y valida el `id_token`. */
  async complete(
    state: string,
    code: string,
    expectedRealm?: FederationRealm,
  ): Promise<FederatedIdentity> {
    const pending = await this.dependencies.authorizations.consume(state);
    if (pending === undefined) {
      throw new AuthBrokerError(
        'AUTHORIZATION_STATE_INVALID',
        'El `state` recibido no corresponde a ninguna autorización en curso.',
      );
    }
    if (pending.expiresAt <= this.dependencies.clock.now()) {
      throw new AuthBrokerError(
        'AUTHORIZATION_STATE_EXPIRED',
        'La autorización expiró; hay que reiniciar el inicio de sesión.',
        { idpCode: pending.idpCode },
      );
    }
    if (expectedRealm !== undefined && pending.realm !== expectedRealm) {
      throw new AuthBrokerError(
        'AUTHORIZATION_REALM_MISMATCH',
        'La autorización pertenece a otro ámbito de confianza.',
        { idpCode: pending.idpCode, realm: pending.realm },
      );
    }

    const idp = await this.requireIdentityProvider(pending.idpCode);
    const clientSecret = await this.resolveClientSecret(idp);

    const exchanged = await this.dependencies.codeClient.exchange({
      idpCode: idp.idpCode,
      tokenEndpoint: idp.tokenEndpoint,
      clientId: idp.clientId,
      ...(clientSecret !== undefined ? { clientSecret } : {}),
      code,
      codeVerifier: pending.codeVerifier,
      redirectUri: pending.redirectUri,
    });

    const claims = await this.dependencies.idTokenVerifier.verify(exchanged.idToken, {
      issuer: idp.issuer,
      audience: idp.clientId,
      nonce: pending.nonce,
      jwksUri: idp.jwksUri,
    });

    this.dependencies.logger.info('federated_authorization_completed', {
      idpCode: idp.idpCode,
      realm: pending.realm,
    });

    return {
      issuer: claims.iss,
      subject: claims.sub,
      realm: pending.realm,
      idpCode: idp.idpCode,
      // `email_verified` ausente se trata como no verificado: asumir lo contrario permitiría
      // tomar posesión de una cuenta interna registrando ese correo en un IdP permisivo.
      emailVerified: claims.email_verified === true,
      ...(claims.email !== undefined ? { email: claims.email } : {}),
      ...(claims.name !== undefined ? { displayName: claims.name } : {}),
      ...(claims.auth_time !== undefined
        ? { authenticatedAt: new Date(claims.auth_time * 1_000).toISOString() }
        : {}),
    };
  }

  /** Purga autorizaciones caducadas. Lo invoca el ciclo de mantenimiento del worker. */
  purgeExpired(): Promise<number> {
    return this.dependencies.authorizations.purgeExpired(this.dependencies.clock.now());
  }

  /**
   * Resuelve el secreto de cliente de un IdP confidencial.
   *
   * Falla explícitamente si el IdP declara `secretRef` y el vault no tiene material. Antes se
   * devolvía `undefined` y el canje salía sin autenticación de cliente: el IdP respondía 401 y el
   * operador veía "el proveedor rechazó las credenciales" cuando el problema real era que el
   * vault estaba vacío. Dos causas muy distintas con el mismo mensaje es exactamente lo que hace
   * que un incidente de login dure horas.
   */
  private async resolveClientSecret(idp: IdentityProviderConfig): Promise<string | undefined> {
    if (idp.secretRef === undefined) return undefined;

    const clientSecret = await this.dependencies.vault.read(
      idp.secretRef,
      SECRET_FIELDS.clientSecret,
    );
    if (clientSecret === undefined) {
      throw new AuthBrokerError(
        'CREDENTIAL_NOT_FOUND',
        `El proveedor de identidad ${idp.idpCode} está declarado como confidencial pero no hay secreto de cliente en el vault.`,
        { idpCode: idp.idpCode },
      );
    }
    return clientSecret;
  }

  private async requireIdentityProvider(idpCode: string): Promise<IdentityProviderConfig> {
    const idp = await this.dependencies.identityProviders.find(idpCode);
    if (!idp) {
      throw new AuthBrokerError(
        'IDENTITY_PROVIDER_NOT_FOUND',
        `No hay proveedor de identidad configurado con código ${idpCode}.`,
        { idpCode },
      );
    }
    return idp;
  }
}
