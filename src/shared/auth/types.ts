export type InternalUser = {
  id: string;
  tenantId?: string;
  email: string;
  fullName: string;
  userCode?: string | null;
  status: string;
  department?: string | null;
  jobTitle?: string | null;
  mustChangePassword?: boolean;
  mfaEnabled?: boolean;
  roles: string[];
  legacyRoles?: string[];
  permissions: string[];
  effectivePermissions?: unknown[];
  permissionKeys?: unknown[];
};

export type InternalAccessProfile = {
  user: InternalUser;
  permissions?: unknown[];
  session?: {
    expiresAt?: string;
    issuedAt?: string;
  };
};

export type InternalAuthResponse = InternalAccessProfile & {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: "Bearer" | "Cookie";
  expiresIn?: string;
  csrfToken?: string;
};

export type InternalSession = InternalAuthResponse;

export type LoginInput = {
  tenantId: string;
  email: string;
  password: string;
};

/**
 * Desafío de segundo factor. Lo devuelven dos flujos con la misma forma —el login interno y el
 * primer paso del cambio de contraseña—, y en los dos casos se responde con el código de 6 dígitos
 * que llega al correo de la cuenta.
 */
export type PinChallenge = {
  pinChallengeRequired: true;
  challengeToken: string;
  expiresInMinutes: number;
};

/**
 * El login termina en UNA de dos cosas, y las dos son un éxito. Tiparlo como unión es lo que
 * obliga a la pantalla a decidir qué hace con el desafío: antes se guardaba la respuesta como si
 * siempre fuera una sesión, así que un desafío acababa persistido como una sesión sin usuario y el
 * portal quedaba "dentro" sin estarlo.
 */
export type LoginOutcome = InternalSession | PinChallenge;

export function isPinChallenge(outcome: LoginOutcome): outcome is PinChallenge {
  return (outcome as PinChallenge).pinChallengeRequired === true;
}

export type PasswordChangeInput = {
  challengeToken: string;
  code: string;
  newPassword: string;
};
