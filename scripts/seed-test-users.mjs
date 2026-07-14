#!/usr/bin/env node
/**
 * Crea usuarios internos de prueba (contador, publicista, etc.) contra un
 * backend real de desarrollo/QA, para que un ERP u otro sistema externo
 * tenga cuentas representativas con las que integrar y probar.
 *
 * NO inventa roles: cada perfil se asigna solo si existe un rol real en
 * `/internal/roles` que calce por palabra clave. Si no hay match, el usuario
 * se crea sin rol y se avisa por consola (mismo principio que el resto del
 * portal: "no se inventan roles").
 *
 * Uso:
 *   node scripts/seed-test-users.mjs --apply
 *     (sin --apply corre en modo dry-run: solo imprime qué haría)
 *
 * Variables de entorno:
 *   ATLAS_API_BASE_URL   default http://localhost:3005/api/v1
 *   ATLAS_TENANT_ID      default 1
 *   ATLAS_ADMIN_EMAIL    admin ya existente con permiso internal.users.manage
 *   ATLAS_ADMIN_PASSWORD contraseña de ese admin
 *
 * Este script solo debe correr contra ambientes LOCAL/DEV/QA, nunca contra
 * producción. Las contraseñas temporales generadas se imprimen una sola vez
 * en la salida de consola; no se guardan en ningún archivo del repo.
 */

const API_BASE_URL =
  process.env.ATLAS_API_BASE_URL ?? "http://localhost:3005/api/v1";
const TENANT_ID = process.env.ATLAS_TENANT_ID ?? "1";
const ADMIN_EMAIL = process.env.ATLAS_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ATLAS_ADMIN_PASSWORD;
const APPLY = process.argv.includes("--apply");

// Perfiles de negocio pedidos para pruebas de integración con el ERP.
// "roleKeyword" se busca (case-insensitive) contra name/code de roles reales;
// si no aparece ningún rol real que calce, el usuario se crea sin rol.
const TEST_PROFILES = [
  {
    slug: "contador",
    fullName: "Contador Prueba QA",
    department: "FINANCE",
    jobTitle: "Contador",
    roleKeyword: "cont",
  },
  {
    slug: "publicista",
    fullName: "Publicista Prueba QA",
    // No existe departamento MARKETING en el enum actual del portal.
    // Se usa SUPPORT como aproximación; revisar con negocio si hace falta
    // agregar un departamento dedicado.
    department: "SUPPORT",
    jobTitle: "Publicista / Marketing",
    roleKeyword: "market",
  },
  {
    slug: "auditor",
    fullName: "Auditor Prueba QA",
    department: "AUDIT",
    jobTitle: "Auditor interno",
    roleKeyword: "audit",
  },
  {
    slug: "analista-riesgo",
    fullName: "Analista de Riesgo Prueba QA",
    department: "RISK",
    jobTitle: "Analista de riesgo",
    roleKeyword: "risk",
  },
  {
    slug: "cobranza",
    fullName: "Agente de Cobranza Prueba QA",
    department: "COLLECTIONS",
    jobTitle: "Agente de cobranza",
    roleKeyword: "collect",
  },
  {
    slug: "cumplimiento",
    fullName: "Oficial de Cumplimiento Prueba QA",
    department: "COMPLIANCE",
    jobTitle: "Oficial de cumplimiento",
    roleKeyword: "complian",
  },
  {
    slug: "sistemas",
    fullName: "Analista de Sistemas Prueba QA",
    department: "SYSTEMS",
    jobTitle: "Analista de sistemas",
    roleKeyword: "system",
  },
  {
    slug: "operaciones",
    fullName: "Analista de Operaciones Prueba QA",
    department: "OPERATIONS",
    jobTitle: "Analista de operaciones",
    roleKeyword: "operat",
  },
];

const TEST_EMAIL_DOMAIN =
  process.env.ATLAS_TEST_EMAIL_DOMAIN ?? "qa-test.internal";

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      "Falta ATLAS_ADMIN_EMAIL / ATLAS_ADMIN_PASSWORD en el entorno. " +
        "Se necesita un admin real con internal.users.manage para crear usuarios.",
    );
    process.exit(1);
  }

  console.log(`Backend: ${API_BASE_URL} (tenant ${TENANT_ID})`);
  console.log(
    APPLY
      ? "Modo: APLICAR cambios reales"
      : "Modo: DRY-RUN (usa --apply para ejecutar)",
  );

  const accessToken = await login();
  const roles = await listRoles(accessToken);
  console.log(
    `Roles reales disponibles: ${roles.map((r) => r.code).join(", ") || "(ninguno)"}`,
  );

  const created = [];
  for (const profile of TEST_PROFILES) {
    const email = `${profile.slug}@${TEST_EMAIL_DOMAIN}`;
    const matchedRole = roles.find((role) =>
      `${role.code} ${role.name}`.toLowerCase().includes(profile.roleKeyword),
    );

    if (!matchedRole) {
      console.warn(
        `[AVISO] Sin rol real para "${profile.slug}" (keyword "${profile.roleKeyword}"). ` +
          "Se crea sin rol asignado; asignar manualmente desde el portal si corresponde.",
      );
    }

    if (!APPLY) {
      console.log(
        `[dry-run] crearía ${email} (${profile.department}) rol=${matchedRole?.code ?? "(ninguno)"}`,
      );
      continue;
    }

    const result = await createUser(accessToken, profile, email, matchedRole);
    created.push(result);
  }

  if (APPLY && created.length > 0) {
    console.log(
      "\nUsuarios creados (contraseñas temporales, mostradas una sola vez):",
    );
    for (const entry of created) {
      console.log(`- ${entry.email}: ${entry.temporaryPassword}`);
    }
  }
}

async function login() {
  const response = await apiFetch("/internal/auth/login", {
    method: "POST",
    skipAuth: true,
    body: { tenantId: TENANT_ID, email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const token = response?.accessToken;
  if (!token) {
    throw new Error(
      "Login de admin no devolvió accessToken; revisar credenciales/contrato.",
    );
  }
  return token;
}

async function listRoles(accessToken) {
  const response = await apiFetch("/internal/roles", { accessToken });
  const items = Array.isArray(response) ? response : (response?.items ?? []);
  return items;
}

async function createUser(accessToken, profile, email, matchedRole) {
  const temporaryPassword = generateTemporaryPassword();
  const signupResult = await apiFetch("/internal/auth/signup", {
    method: "POST",
    accessToken,
    body: {
      email,
      password: temporaryPassword,
      fullName: profile.fullName,
      department: profile.department,
      jobTitle: profile.jobTitle,
    },
  });
  const user = signupResult?.user ?? signupResult;

  if (matchedRole) {
    await apiFetch(`/internal/users/${user.id}/roles`, {
      method: "PATCH",
      accessToken,
      body: { roles: [matchedRole.code] },
    });
  }

  await apiFetch(`/internal/users/${user.id}`, {
    method: "PATCH",
    accessToken,
    body: {
      mustChangePassword: true,
      reason: "Alta de usuario de prueba QA vía scripts/seed-test-users.mjs",
    },
  });

  return { email, temporaryPassword };
}

function generateTemporaryPassword(length = 20) {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += charset[Math.floor(Math.random() * charset.length)];
  }
  return out;
}

async function apiFetch(
  path,
  { method = "GET", body, accessToken, skipAuth } = {},
) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-tenant-id": TENANT_ID,
  };
  if (!skipAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`${method} ${path} -> ${message}`);
  }

  return payload && typeof payload === "object" && "data" in payload
    ? payload.data
    : payload;
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
