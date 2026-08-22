import { createSign, generateKeyPairSync } from 'node:crypto';
import type { HttpFetch } from '../src/application/ports';
import { IdTokenVerifier } from '../src/infrastructure/crypto/id-token.verifier';
import { FakeClock, jsonResponse } from './helpers';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

const jwk = {
  ...(publicKey.export({ format: 'jwk' }) as Record<string, unknown>),
  kid: 'kid-1',
  alg: 'RS256',
  use: 'sig',
};

const ISSUER = 'https://idp.example';
const AUDIENCE = 'atlas-portal';
const NONCE = 'nonce-de-la-autorizacion';

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signToken(
  claims: Record<string, unknown>,
  header: Record<string, unknown> = { alg: 'RS256', kid: 'kid-1' },
): string {
  const signingInput = `${encode(header)}.${encode(claims)}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${signer.sign(privateKey).toString('base64url')}`;
}

function baseClaims(clock: FakeClock): Record<string, unknown> {
  const nowSeconds = Math.floor(clock.now() / 1_000);
  return {
    iss: ISSUER,
    sub: 'user-42',
    aud: AUDIENCE,
    iat: nowSeconds,
    exp: nowSeconds + 300,
    nonce: NONCE,
    email: 'persona@example.com',
    email_verified: true,
  };
}

type Setup = { verifier: IdTokenVerifier; clock: FakeClock; jwksCalls: () => number };

function setup(keys: readonly Record<string, unknown>[] = [jwk]): Setup {
  const clock = new FakeClock();
  let jwksCalls = 0;
  const fetchImpl: HttpFetch = () => {
    jwksCalls += 1;
    return Promise.resolve(jsonResponse(200, { keys }));
  };
  return {
    verifier: new IdTokenVerifier({ fetchImpl, clock }),
    clock,
    jwksCalls: () => jwksCalls,
  };
}

const expectations = {
  issuer: ISSUER,
  audience: AUDIENCE,
  nonce: NONCE,
  jwksUri: 'https://idp.example/jwks',
};

describe('IdTokenVerifier — token legítimo', () => {
  it('acepta un id_token bien firmado y devuelve sus reclamaciones', async () => {
    const { verifier, clock } = setup();

    const claims = await verifier.verify(signToken(baseClaims(clock)), expectations);

    expect(claims.sub).toBe('user-42');
    expect(claims.email).toBe('persona@example.com');
  });

  it('cachea el JWKS entre verificaciones', async () => {
    const { verifier, clock, jwksCalls } = setup();

    await verifier.verify(signToken(baseClaims(clock)), expectations);
    await verifier.verify(signToken(baseClaims(clock)), expectations);

    expect(jwksCalls()).toBe(1);
  });
});

describe('IdTokenVerifier — falsificación de firma', () => {
  it('rechaza alg: none', async () => {
    const { verifier, clock } = setup();
    const claims = baseClaims(clock);
    const unsigned = `${encode({ alg: 'none' })}.${encode(claims)}.`;

    await expect(verifier.verify(unsigned, expectations)).rejects.toMatchObject({
      code: 'ID_TOKEN_INVALID',
    });
  });

  it('rechaza un algoritmo simétrico aunque el token lo declare', async () => {
    const { verifier, clock } = setup();
    const token = signToken(baseClaims(clock), { alg: 'HS256', kid: 'kid-1' });

    await expect(verifier.verify(token, expectations)).rejects.toMatchObject({
      code: 'ID_TOKEN_INVALID',
    });
  });

  it('rechaza una firma que no valida contra la clave publicada', async () => {
    const { verifier, clock } = setup();
    const token = signToken(baseClaims(clock));
    const tampered = `${token.slice(0, -6)}AAAAAA`;

    await expect(verifier.verify(tampered, expectations)).rejects.toMatchObject({
      code: 'ID_TOKEN_INVALID',
    });
  });

  it('rechaza si el IdP no publica la clave con la que se firmó', async () => {
    const { verifier, clock } = setup([{ ...jwk, kid: 'otro-kid' }]);

    await expect(verifier.verify(signToken(baseClaims(clock)), expectations)).rejects.toMatchObject(
      { code: 'ID_TOKEN_INVALID' },
    );
  });
});

describe('IdTokenVerifier — reclamaciones', () => {
  it('rechaza un token emitido para otra aplicación', async () => {
    const { verifier, clock } = setup();
    const token = signToken({ ...baseClaims(clock), aud: 'otra-app' });

    await expect(verifier.verify(token, expectations)).rejects.toThrow(/audiencia/u);
  });

  it('rechaza un emisor distinto del configurado', async () => {
    const { verifier, clock } = setup();
    const token = signToken({ ...baseClaims(clock), iss: 'https://idp-falso.example' });

    await expect(verifier.verify(token, expectations)).rejects.toThrow(/emisor/u);
  });

  it('rechaza un nonce que no corresponde a esta autorización', async () => {
    const { verifier, clock } = setup();
    const token = signToken({ ...baseClaims(clock), nonce: 'nonce-de-otro-flujo' });

    await expect(verifier.verify(token, expectations)).rejects.toThrow(/nonce/u);
  });

  it('rechaza un token sin nonce', async () => {
    const { verifier, clock } = setup();
    const claimsSinNonce = baseClaims(clock);
    delete claimsSinNonce.nonce;
    const token = signToken(claimsSinNonce);

    await expect(verifier.verify(token, expectations)).rejects.toThrow(/nonce/u);
  });

  it('rechaza un token expirado', async () => {
    const { verifier, clock } = setup();
    const token = signToken(baseClaims(clock));
    clock.advance(400 * 1_000);

    await expect(verifier.verify(token, expectations)).rejects.toThrow(/expirado/u);
  });

  it('rechaza un token multi-audiencia sin azp para este cliente', async () => {
    const { verifier, clock } = setup();
    const token = signToken({ ...baseClaims(clock), aud: [AUDIENCE, 'otra-app'] });

    await expect(verifier.verify(token, expectations)).rejects.toThrow(/azp/u);
  });

  it('acepta un token multi-audiencia con azp correcto', async () => {
    const { verifier, clock } = setup();
    const token = signToken({ ...baseClaims(clock), aud: [AUDIENCE, 'otra-app'], azp: AUDIENCE });

    await expect(verifier.verify(token, expectations)).resolves.toMatchObject({ sub: 'user-42' });
  });
});
