/**
 * Prueba end-to-end real del broker.
 *
 * No hay dobles de prueba del lado del broker: se compila, se arranca el proceso de verdad
 * (`dist/src/standalone/worker-main.js`) y se habla con él por HTTP real. Enfrente se levanta un
 * proveedor/IdP autónomo con claves RSA reales que:
 *
 *   - valida `client_secret_basic` en su endpoint de token y rechaza credenciales incorrectas;
 *   - exige PKCE `S256` y comprueba el `code_verifier` contra el `code_challenge`;
 *   - autentica a un USUARIO real con usuario y contraseña antes de emitir el código;
 *   - firma el `id_token` con RS256 y publica su clave en un JWKS.
 *
 * Lo que esto NO puede probar —y no finge probar— es la conexión con SEGIP, InfoCenter o Meta
 * reales: eso exige credenciales de producción, que no se tocan aquí.
 *
 * Uso: `yarn build && yarn smoke:e2e`
 */
import { spawn } from 'node:child_process';
import { createHash, createSign, generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

const IDP_PORT = 4310;
const BROKER_PORT = 4311;
const IDP_ORIGIN = `http://127.0.0.1:${IDP_PORT}`;
const BROKER_ORIGIN = `http://127.0.0.1:${BROKER_PORT}`;

const SERVICE_TOKEN = randomBytes(32).toString('base64url');
const MASTER_KEY = randomBytes(32).toString('base64');

// Credenciales del proveedor saliente (SEGIP), tal y como las custodiará el vault.
const SEGIP_CLIENT_ID = 'atlas-segip-client';
const SEGIP_CLIENT_SECRET = 'secreto-original-de-segip-1234';

// Cliente OIDC del portal y usuario real que va a iniciar sesión.
const OIDC_CLIENT_ID = 'atlas-admin-portal';
const OIDC_CLIENT_SECRET = 'secreto-oidc-del-portal-5678';
const REDIRECT_URI = 'https://portal.atlas.example/internal/login/callback';
const USER = {
  username: 'pablo.arauz',
  password: 'Contraseña-Real-2026!',
  subject: 'internal-user-9f2c',
  email: 'pablo.arauz@atlas.example',
  name: 'Pablo Arauz Caballero',
};

let failures = 0;
let checks = 0;

function check(description, condition, detail) {
  checks += 1;
  if (condition) {
    console.log(`  ✓ ${description}`);
    return;
  }
  failures += 1;
  console.log(`  ✗ ${description}${detail === undefined ? '' : ` — ${detail}`}`);
}

function section(title) {
  console.log(`\n${title}`);
}

// --------------------------------------------------------------------------
// Proveedor/IdP autónomo con criptografía real.
// --------------------------------------------------------------------------

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'idp-key-1', alg: 'RS256', use: 'sig' };

const base64Url = (value) => Buffer.from(value).toString('base64url');

function signIdToken(claims) {
  const header = { alg: 'RS256', kid: 'idp-key-1', typ: 'JWT' };
  const input = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(input);
  signer.end();
  return `${input}.${signer.sign(privateKey).toString('base64url')}`;
}

function basicCredentials(header) {
  if (typeof header !== 'string' || !header.startsWith('Basic ')) return null;
  const [id, secret] = Buffer.from(header.slice(6), 'base64').toString('utf8').split(':');
  return { id: decodeURIComponent(id ?? ''), secret: decodeURIComponent(secret ?? '') };
}

/** Estado del IdP: códigos de autorización emitidos y contadores para las aserciones. */
const authorizationCodes = new Map();
const counters = { clientCredentialsTokens: 0, rejectedClientCredentials: 0 };
/** Secreto vigente de SEGIP en el proveedor. La rotación lo cambia, como en la vida real. */
let segipSecretAtProvider = SEGIP_CLIENT_SECRET;

function readBody(request) {
  return new Promise((resolve) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

const idpServer = createServer(async (request, response) => {
  const url = new URL(request.url, IDP_ORIGIN);

  // --- Proveedor externo: client_credentials (RFC 6749 §4.4) --------------
  if (url.pathname === '/segip/oauth2/token' && request.method === 'POST') {
    const credentials = basicCredentials(request.headers.authorization);
    if (!credentials || credentials.id !== SEGIP_CLIENT_ID || credentials.secret !== segipSecretAtProvider) {
      counters.rejectedClientCredentials += 1;
      return json(response, 401, { error: 'invalid_client' });
    }
    const form = new URLSearchParams(await readBody(request));
    if (form.get('grant_type') !== 'client_credentials') {
      return json(response, 400, { error: 'unsupported_grant_type' });
    }
    counters.clientCredentialsTokens += 1;
    return json(response, 200, {
      access_token: `segip-token-${counters.clientCredentialsTokens}`,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: form.get('scope') ?? '',
    });
  }

  // --- IdP: pantalla de inicio de sesión del usuario ----------------------
  if (url.pathname === '/oidc/authorize' && request.method === 'GET') {
    if (url.searchParams.get('response_type') !== 'code') {
      return json(response, 400, { error: 'unsupported_response_type' });
    }
    if (url.searchParams.get('client_id') !== OIDC_CLIENT_ID) {
      return json(response, 400, { error: 'unauthorized_client' });
    }
    if (url.searchParams.get('redirect_uri') !== REDIRECT_URI) {
      return json(response, 400, { error: 'invalid_redirect_uri' });
    }
    // PKCE obligatorio del lado del IdP: si el broker no lo enviara, esto fallaría.
    if (url.searchParams.get('code_challenge_method') !== 'S256' || !url.searchParams.get('code_challenge')) {
      return json(response, 400, { error: 'pkce_required' });
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return response.end('<form method="post" action="/oidc/login">campo usuario y contraseña</form>');
  }

  // --- IdP: el usuario envía sus credenciales -----------------------------
  if (url.pathname === '/oidc/login' && request.method === 'POST') {
    const form = new URLSearchParams(await readBody(request));
    if (form.get('username') !== USER.username || form.get('password') !== USER.password) {
      return json(response, 401, { error: 'invalid_user_credentials' });
    }
    const code = randomUUID();
    authorizationCodes.set(code, {
      codeChallenge: form.get('code_challenge'),
      nonce: form.get('nonce'),
      redirectUri: form.get('redirect_uri'),
      used: false,
    });
    const location = new URL(form.get('redirect_uri'));
    location.searchParams.set('code', code);
    location.searchParams.set('state', form.get('state'));
    response.writeHead(302, { location: location.toString() });
    return response.end();
  }

  // --- IdP: canje del código ----------------------------------------------
  if (url.pathname === '/oidc/token' && request.method === 'POST') {
    const credentials = basicCredentials(request.headers.authorization);
    if (!credentials || credentials.id !== OIDC_CLIENT_ID || credentials.secret !== OIDC_CLIENT_SECRET) {
      return json(response, 401, { error: 'invalid_client' });
    }
    const form = new URLSearchParams(await readBody(request));
    const entry = authorizationCodes.get(form.get('code'));
    if (!entry || entry.used) return json(response, 400, { error: 'invalid_grant' });

    // Verificación PKCE real: S256(code_verifier) debe igualar el code_challenge guardado.
    const verifier = form.get('code_verifier') ?? '';
    const computed = createHash('sha256').update(verifier, 'ascii').digest('base64url');
    if (computed !== entry.codeChallenge) return json(response, 400, { error: 'invalid_pkce_verifier' });

    entry.used = true;
    const nowSeconds = Math.floor(Date.now() / 1000);
    return json(response, 200, {
      token_type: 'Bearer',
      expires_in: 300,
      id_token: signIdToken({
        iss: `${IDP_ORIGIN}/oidc`,
        sub: USER.subject,
        aud: OIDC_CLIENT_ID,
        iat: nowSeconds,
        exp: nowSeconds + 300,
        auth_time: nowSeconds,
        nonce: entry.nonce,
        email: USER.email,
        email_verified: true,
        name: USER.name,
      }),
    });
  }

  if (url.pathname === '/oidc/jwks') return json(response, 200, { keys: [jwk] });

  return json(response, 404, { error: 'not_found' });
});

// --------------------------------------------------------------------------
// Cliente del broker.
// --------------------------------------------------------------------------

async function brokerRequest(method, path, body, token = SERVICE_TOKEN) {
  const response = await fetch(`${BROKER_ORIGIN}${path}`, {
    method,
    headers: {
      ...(token === null ? {} : { authorization: `Bearer ${token}` }),
      'content-type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, body: payload };
}

async function waitForBroker() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${BROKER_ORIGIN}/health/live`);
      if (response.ok) return true;
    } catch {
      /* el proceso todavía no escucha */
    }
    await delay(100);
  }
  return false;
}

// --------------------------------------------------------------------------
// Escenario.
// --------------------------------------------------------------------------

async function run() {
  console.log('Prueba end-to-end del atlas-auth-broker-worker\n');
  console.log(`  IdP/proveedor : ${IDP_ORIGIN}`);
  console.log(`  Broker        : ${BROKER_ORIGIN}`);

  await new Promise((resolve) => idpServer.listen(IDP_PORT, '127.0.0.1', resolve));

  const worker = spawn(process.execPath, ['dist/src/standalone/worker-main.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_BROKER_PORT: String(BROKER_PORT),
      AUTH_BROKER_SERVICE_TOKEN: SERVICE_TOKEN,
      // Driver de producción: cifrado de sobre real, no variables en claro.
      AUTH_BROKER_VAULT_DRIVER: 'kms',
      AUTH_BROKER_MASTER_KEY_BASE64: MASTER_KEY,
      AUTH_BROKER_SEED_SECRETS_FROM_ENV: 'true',
      AUTH_BROKER_SEGIP_TOKEN_ENDPOINT: `${IDP_ORIGIN}/segip/oauth2/token`,
      AUTH_BROKER_SECRET__PROVIDER_SEGIP__CLIENT_ID: SEGIP_CLIENT_ID,
      AUTH_BROKER_SECRET__PROVIDER_SEGIP__CLIENT_SECRET: SEGIP_CLIENT_SECRET,
      AUTH_BROKER_SECRET__IDP_CORPORATE_OIDC__CLIENT_SECRET: OIDC_CLIENT_SECRET,
      AUTH_BROKER_IDENTITY_PROVIDERS: JSON.stringify([
        {
          idpCode: 'CORPORATE_OIDC',
          realm: 'internal_sso',
          issuer: `${IDP_ORIGIN}/oidc`,
          authorizationEndpoint: `${IDP_ORIGIN}/oidc/authorize`,
          tokenEndpoint: `${IDP_ORIGIN}/oidc/token`,
          jwksUri: `${IDP_ORIGIN}/oidc/jwks`,
          clientId: OIDC_CLIENT_ID,
          confidential: true,
          scopes: ['openid', 'profile', 'email'],
          redirectUri: REDIRECT_URI,
        },
      ]),
      // El catálogo declara endpoints HTTPS; en la prueba local el IdP es HTTP, así que se relaja
      // sólo esa comprobación mediante la variable de escape del propio esquema.
      AUTH_BROKER_ALLOW_INSECURE_IDP: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const workerLog = [];
  worker.stdout.on('data', (chunk) => workerLog.push(chunk.toString()));
  worker.stderr.on('data', (chunk) => workerLog.push(chunk.toString()));

  try {
    if (!(await waitForBroker())) {
      console.log('\nEl broker no llegó a escuchar. Salida del proceso:\n');
      console.log(workerLog.join(''));
      process.exitCode = 1;
      return;
    }

    section('1. Frontera de autenticación del propio broker');
    const noToken = await brokerRequest('GET', '/outbound/providers/auth-state', undefined, null);
    check('rechaza una llamada sin token de servicio', noToken.status === 401, `status ${noToken.status}`);
    const badToken = await brokerRequest('GET', '/outbound/providers/auth-state', undefined, 'token-incorrecto');
    check('rechaza un token de servicio incorrecto', badToken.status === 401, `status ${badToken.status}`);
    const ready = await brokerRequest('GET', '/health/ready');
    check('responde readiness con el driver de vault cifrado', ready.body?.vaultDriver === 'kms', JSON.stringify(ready.body));

    section('2. Autenticación saliente contra el proveedor (OAuth2 real)');
    const authorize = await brokerRequest('POST', '/outbound/providers/SEGIP/authorize');
    check('autoriza la llamada a SEGIP', authorize.status === 200, JSON.stringify(authorize.body));
    check(
      'devuelve el token emitido por el proveedor en la cabecera Authorization',
      authorize.body?.headers?.authorization === 'Bearer segip-token-1',
      JSON.stringify(authorize.body?.headers),
    );
    check('el proveedor emitió exactamente un token', counters.clientCredentialsTokens === 1);

    const cached = await brokerRequest('POST', '/outbound/providers/SEGIP/authorize');
    check(
      'reutiliza el token cacheado en vez de volver a pedirlo',
      cached.body?.headers?.authorization === 'Bearer segip-token-1' && counters.clientCredentialsTokens === 1,
      `tokens emitidos: ${counters.clientCredentialsTokens}`,
    );

    const state = await brokerRequest('GET', '/outbound/providers/SEGIP/auth-state');
    check('la credencial figura como ACTIVE', state.body?.credentialStatus === 'ACTIVE', JSON.stringify(state.body));
    check('el token figura como VALID', state.body?.tokenStatus === 'VALID', JSON.stringify(state.body));
    check('publica una huella de la credencial', typeof state.body?.credentialFingerprint === 'string');
    check(
      'el estado publicable NO contiene el secreto',
      !JSON.stringify(state.body).includes(SEGIP_CLIENT_SECRET),
    );

    section('3. Rotación de la credencial');
    const nuevoSecreto = 'secreto-rotado-de-segip-9876';
    segipSecretAtProvider = nuevoSecreto; // el proveedor ya acepta solo el nuevo
    const rotated = await brokerRequest('POST', '/outbound/providers/SEGIP/rotate', {
      field: 'CLIENT_SECRET',
      material: nuevoSecreto,
    });
    check('rota la credencial', rotated.status === 200, JSON.stringify(rotated.body));
    check('devuelve la huella nueva, no el material', typeof rotated.body?.fingerprint === 'string' && !JSON.stringify(rotated.body).includes(nuevoSecreto));

    const afterRotation = await brokerRequest('POST', '/outbound/providers/SEGIP/authorize');
    check(
      'tras rotar pide un token nuevo con el secreto nuevo',
      afterRotation.body?.headers?.authorization === 'Bearer segip-token-2',
      JSON.stringify(afterRotation.body?.headers),
    );
    check('el proveedor no rechazó ninguna credencial', counters.rejectedClientCredentials === 0);

    section('4. Revocación');
    const revoked = await brokerRequest('POST', '/outbound/providers/SEGIP/revoke', {
      reason: 'prueba end-to-end de contención',
    });
    check('revoca la credencial', revoked.status === 200, JSON.stringify(revoked.body));
    const afterRevoke = await brokerRequest('POST', '/outbound/providers/SEGIP/authorize');
    check('tras revocar se niega a autorizar', afterRevoke.body?.code === 'CREDENTIAL_REVOKED', JSON.stringify(afterRevoke.body));

    section('5. Inicio de sesión de un usuario real por OIDC');
    const begun = await brokerRequest('POST', '/inbound/authorizations', {
      idpCode: 'CORPORATE_OIDC',
      realm: 'internal_sso',
    });
    check('inicia la autorización', begun.status === 201, JSON.stringify(begun.body));

    const authorizationUrl = new URL(begun.body.authorizationUrl);
    check('usa PKCE S256', authorizationUrl.searchParams.get('code_challenge_method') === 'S256');
    check('no filtra el code_verifier', !begun.body.authorizationUrl.includes('code_verifier'));

    // El navegador del usuario abre la URL de autorización.
    const loginPage = await fetch(begun.body.authorizationUrl);
    check('el IdP acepta la petición de autorización y muestra el login', loginPage.status === 200, `status ${loginPage.status}`);

    // El usuario escribe sus credenciales reales.
    const loginForm = new URLSearchParams({
      username: USER.username,
      password: USER.password,
      state: authorizationUrl.searchParams.get('state'),
      nonce: authorizationUrl.searchParams.get('nonce'),
      code_challenge: authorizationUrl.searchParams.get('code_challenge'),
      redirect_uri: authorizationUrl.searchParams.get('redirect_uri'),
    });
    const badLogin = await fetch(`${IDP_ORIGIN}/oidc/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...Object.fromEntries(loginForm), password: 'incorrecta' }).toString(),
      redirect: 'manual',
    });
    check('el IdP rechaza una contraseña incorrecta', badLogin.status === 401, `status ${badLogin.status}`);

    const login = await fetch(`${IDP_ORIGIN}/oidc/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: loginForm.toString(),
      redirect: 'manual',
    });
    check('el usuario se autentica y el IdP redirige con el código', login.status === 302, `status ${login.status}`);

    const callbackUrl = new URL(login.headers.get('location'));
    const code = callbackUrl.searchParams.get('code');
    check('el state devuelto es el que emitió el broker', callbackUrl.searchParams.get('state') === begun.body.state);

    const completed = await brokerRequest('POST', '/inbound/authorizations/callback', {
      state: begun.body.state,
      code,
      realm: 'internal_sso',
    });
    check('completa el inicio de sesión', completed.status === 200, JSON.stringify(completed.body));
    check('identifica al usuario real', completed.body?.subject === USER.subject, JSON.stringify(completed.body));
    check('devuelve su correo verificado', completed.body?.email === USER.email && completed.body?.emailVerified === true);
    check('devuelve su nombre', completed.body?.displayName === USER.name);
    check('lo sitúa en el ámbito de SSO interno', completed.body?.realm === 'internal_sso');

    section('6. Defensas del flujo entrante');
    const replay = await brokerRequest('POST', '/inbound/authorizations/callback', {
      state: begun.body.state,
      code,
    });
    check('un replay del mismo state es rechazado', replay.body?.code === 'AUTHORIZATION_STATE_INVALID', JSON.stringify(replay.body));

    const foreign = await brokerRequest('POST', '/inbound/authorizations/callback', {
      state: 'state-inventado-por-un-atacante-000',
      code: 'codigo-cualquiera',
    });
    check('un state desconocido es rechazado', foreign.body?.code === 'AUTHORIZATION_STATE_INVALID', JSON.stringify(foreign.body));

    const wrongRealm = await brokerRequest('POST', '/inbound/authorizations', {
      idpCode: 'CORPORATE_OIDC',
      realm: 'customer_social',
    });
    check(
      'un IdP de SSO interno no puede usarse en el ámbito social',
      wrongRealm.body?.code === 'AUTHORIZATION_REALM_MISMATCH',
      JSON.stringify(wrongRealm.body),
    );

    section('7. Los secretos no aparecen en el log del worker');
    const logText = workerLog.join('');
    check('el log no contiene el secreto original de SEGIP', !logText.includes(SEGIP_CLIENT_SECRET));
    check('el log no contiene el secreto rotado', !logText.includes(nuevoSecreto));
    check('el log no contiene el secreto OIDC', !logText.includes(OIDC_CLIENT_SECRET));
    check('el log no contiene la contraseña del usuario', !logText.includes(USER.password));
    check('el log no contiene el token de servicio', !logText.includes(SERVICE_TOKEN));

    console.log(`\n${checks - failures}/${checks} comprobaciones superadas.`);
    if (failures > 0) {
      console.log('\nSalida del worker:\n');
      console.log(logText);
      process.exitCode = 1;
    }
  } finally {
    worker.kill('SIGTERM');
    await new Promise((resolve) => idpServer.close(resolve));
    await delay(200);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
