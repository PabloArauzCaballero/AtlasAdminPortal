const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";

/**
 * Genera una contraseña temporal aleatoria para el alta vía signup. Nunca la
 * elige un admin: solo existe para cumplir el campo obligatorio del backend,
 * que la envía por correo a la persona. El portal no la muestra en pantalla,
 * y mustChangePassword la invalida en el primer login.
 */
export function generateTemporaryPassword(length = 20): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => CHARSET[value % CHARSET.length]).join(
    "",
  );
}
