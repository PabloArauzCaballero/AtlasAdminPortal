/**
 * Cifrado de sobre (envelope encryption) para el material custodiado.
 *
 * Por qué de sobre y no cifrado directo con la clave maestra: cada secreto se cifra con su propia
 * clave de datos (DEK) de un solo uso, y solo la DEK se envuelve con la clave maestra. Así la
 * clave maestra cifra unos pocos bloques de 32 bytes en vez de todo el material —lo que la
 * mantiene lejos de los límites de uso de AES-GCM—, y rotar la maestra solo obliga a reenvolver
 * las DEK, no a descifrar y recifrar cada secreto. Es el modelo que implementan los KMS
 * gestionados, y dejarlo aquí explícito permite sustituir la envoltura local por un CMK real sin
 * tocar el resto del broker.
 *
 * AES-256-GCM aporta confidencialidad y autenticidad: un ciphertext manipulado falla al descifrar
 * en vez de devolver basura silenciosamente.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
/** 96 bits es el tamaño de IV recomendado para GCM: usa el camino óptimo y evita rederivación. */
const IV_BYTES = 12;
const TAG_BYTES = 16;
const FORMAT_VERSION = 'v1';
const SEGMENT_COUNT = 6;

export type MasterKey = Buffer;

/**
 * Interpreta una clave maestra en base64 y comprueba que tenga exactamente 256 bits.
 *
 * Una clave más corta se aceptaría en silencio si solo se truncara, dejando el cifrado más débil
 * de lo que dice ser; por eso es un error explícito.
 */
export function parseMasterKey(base64Key: string): MasterKey {
  const key = Buffer.from(base64Key, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `La clave maestra debe tener ${KEY_BYTES} bytes (${KEY_BYTES * 8} bits) en base64; se recibieron ${key.length}.`,
    );
  }
  return key;
}

/** Genera una clave maestra nueva. Pensado para arranque en desarrollo y para pruebas. */
export function generateMasterKeyBase64(): string {
  return randomBytes(KEY_BYTES).toString('base64');
}

function encryptWithKey(
  key: Buffer,
  plaintext: Buffer,
): { iv: Buffer; ciphertext: Buffer; tag: Buffer } {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { iv, ciphertext, tag: cipher.getAuthTag() };
}

function decryptWithKey(key: Buffer, iv: Buffer, ciphertext: Buffer, tag: Buffer): Buffer {
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Cifra un secreto y devuelve el sobre serializado.
 *
 * Formato: `v1.<dekEnvuelta>.<ivEnvoltura>.<tagEnvoltura>.<ivDatos>.<datos>.<tagDatos>` en base64.
 * Es autodescriptivo y versionado, para poder introducir un `v2` sin romper lo ya almacenado.
 */
export function sealSecret(masterKey: MasterKey, plaintext: string): string {
  const dek = randomBytes(KEY_BYTES);
  try {
    const data = encryptWithKey(dek, Buffer.from(plaintext, 'utf8'));
    const wrapped = encryptWithKey(masterKey, dek);
    return [
      FORMAT_VERSION,
      wrapped.ciphertext.toString('base64'),
      wrapped.iv.toString('base64'),
      wrapped.tag.toString('base64'),
      data.iv.toString('base64'),
      data.ciphertext.toString('base64'),
      data.tag.toString('base64'),
    ].join('.');
  } finally {
    // La DEK ya no hace falta en claro: borrarla acorta la ventana en la que aparecería en un
    // volcado de memoria del proceso.
    dek.fill(0);
  }
}

/** Descifra un sobre producido por `sealSecret`. Lanza si fue manipulado o si la clave no es la suya. */
export function openSecret(masterKey: MasterKey, envelope: string): string {
  const segments = envelope.split('.');
  if (segments.length !== SEGMENT_COUNT + 1 || segments[0] !== FORMAT_VERSION) {
    throw new Error('Sobre cifrado con formato desconocido o corrupto.');
  }
  const [, wrappedDek, wrapIv, wrapTag, dataIv, dataCiphertext, dataTag] = segments as [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];

  const dek = decryptWithKey(
    masterKey,
    Buffer.from(wrapIv, 'base64'),
    Buffer.from(wrappedDek, 'base64'),
    Buffer.from(wrapTag, 'base64'),
  );
  try {
    if (dek.length !== KEY_BYTES)
      throw new Error('La clave de datos descifrada no es de 256 bits.');
    const plaintext = decryptWithKey(
      dek,
      Buffer.from(dataIv, 'base64'),
      Buffer.from(dataCiphertext, 'base64'),
      Buffer.from(dataTag, 'base64'),
    );
    return plaintext.toString('utf8');
  } finally {
    dek.fill(0);
  }
}

/**
 * Huella publicable de un secreto.
 *
 * Se prefija con un separador de dominio para que la huella de un secreto no pueda confundirse
 * con —ni reutilizarse como— el hash del mismo texto calculado en otro contexto. Se trunca a 16
 * hex (64 bits): suficiente para distinguir credenciales entre entornos, corto para no invitar a
 * usarla como identificador con valor de autenticación.
 */
export function secretFingerprint(value: string): string {
  return createHash('sha256')
    .update(`atlas-auth-broker:v1:${value}`, 'utf8')
    .digest('hex')
    .slice(0, 16);
}

/**
 * Compara dos secretos en tiempo constante.
 *
 * `timingSafeEqual` exige longitudes iguales, así que se comparan los digest y no los valores:
 * eso preserva la propiedad de tiempo constante sin filtrar la longitud del secreto real.
 */
export function secretsMatch(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left, 'utf8').digest();
  const rightDigest = createHash('sha256').update(right, 'utf8').digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export const CRYPTO_CONSTANTS = { ALGORITHM, KEY_BYTES, IV_BYTES, TAG_BYTES } as const;
