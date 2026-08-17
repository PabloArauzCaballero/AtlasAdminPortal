import {
  generateMasterKeyBase64,
  openSecret,
  parseMasterKey,
  sealSecret,
  secretFingerprint,
  secretsMatch,
} from '../src/infrastructure/crypto/envelope-encryption';

describe('cifrado de sobre', () => {
  const masterKey = parseMasterKey(generateMasterKeyBase64());

  it('devuelve el mismo secreto tras sellarlo y abrirlo', () => {
    const secret = 'client-secret-de-prueba-¡con acentos!';
    expect(openSecret(masterKey, sealSecret(masterKey, secret))).toBe(secret);
  });

  it('produce un sobre distinto cada vez para el mismo secreto', () => {
    // Si dos sobres del mismo secreto fueran idénticos, comparar sobres revelaría qué proveedores
    // comparten credencial sin necesidad de descifrarlos.
    expect(sealSecret(masterKey, 'mismo')).not.toBe(sealSecret(masterKey, 'mismo'));
  });

  it('rechaza un sobre manipulado en vez de devolver datos corruptos', () => {
    const envelope = sealSecret(masterKey, 'material');
    const segments = envelope.split('.');
    const tampered = Buffer.from(segments[5] ?? '', 'base64');
    tampered[0] = (tampered[0] ?? 0) ^ 0xff;
    segments[5] = tampered.toString('base64');

    expect(() => openSecret(masterKey, segments.join('.'))).toThrow();
  });

  it('rechaza un sobre abierto con otra clave maestra', () => {
    const otherKey = parseMasterKey(generateMasterKeyBase64());
    expect(() => openSecret(otherKey, sealSecret(masterKey, 'material'))).toThrow();
  });

  it('rechaza un formato desconocido', () => {
    expect(() => openSecret(masterKey, 'v2.a.b.c.d.e.f')).toThrow(/formato desconocido/u);
  });

  it('exige una clave maestra de 256 bits', () => {
    expect(() => parseMasterKey(Buffer.alloc(16).toString('base64'))).toThrow(/32 bytes/u);
  });
});

describe('huella de secretos', () => {
  it('es estable y no contiene el secreto', () => {
    const fingerprint = secretFingerprint('super-secreto');
    expect(fingerprint).toBe(secretFingerprint('super-secreto'));
    expect(fingerprint).toHaveLength(16);
    expect(fingerprint).not.toContain('super-secreto');
  });

  it('distingue secretos distintos', () => {
    expect(secretFingerprint('uno')).not.toBe(secretFingerprint('dos'));
  });
});

describe('comparación en tiempo constante', () => {
  it('acepta valores iguales y rechaza distintos, incluso de distinta longitud', () => {
    expect(secretsMatch('token-largo-de-servicio', 'token-largo-de-servicio')).toBe(true);
    expect(secretsMatch('token-largo-de-servicio', 'corto')).toBe(false);
  });
});
