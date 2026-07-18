import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InternalProtectedShell } from "@/shared/auth/internal-protected-shell";
import type { useAuth as useAuthType } from "@/shared/auth/auth-context";

const { usePathname, replace } = vi.hoisted(() => ({
  usePathname: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname,
  useRouter: () => ({ replace }),
}));

/**
 * `useAuth` se mockea porque aquí es una dependencia, no el sujeto: lo que se
 * prueba es la máquina de redirección del shell, y necesita poder quedarse en
 * `isHydrated: false` (estado que el provider real solo atraviesa un instante).
 * El contrato de `useAuth` en sí lo cubre `auth-context.test.tsx`.
 */
const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock("@/shared/auth/auth-context", () => ({ useAuth }));

/** El AppShell real arrastra sidebar, topbar y sus consultas: aquí sobra. */
vi.mock("@/shared/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

const { refreshProfile, restoreSessionFromServer } = vi.hoisted(() => ({
  refreshProfile: vi.fn(),
  restoreSessionFromServer: vi.fn(),
}));

const SESION = { user: { email: "user@example.invalid" } };
const LOADER = "Preparando portal interno…";
const CONTENIDO = "Panel interno";

function conAuth({
  session = null as unknown,
  isHydrated = true,
}: { session?: unknown; isHydrated?: boolean } = {}) {
  useAuth.mockReturnValue({
    session,
    isHydrated,
    refreshProfile,
    restoreSessionFromServer,
  } as unknown as ReturnType<typeof useAuthType>);
}

function montar(pathname = "/internal/audit") {
  usePathname.mockReturnValue(pathname);
  return render(
    <InternalProtectedShell>
      <p>{CONTENIDO}</p>
    </InternalProtectedShell>,
  );
}

beforeEach(() => {
  refreshProfile.mockResolvedValue(SESION);
  restoreSessionFromServer.mockResolvedValue(SESION);
});

afterEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/");
});

describe("InternalProtectedShell · antes de hidratar", () => {
  it("no redirige mientras la sesión no se ha leído", async () => {
    // Redirigir aquí sería un bucle: el login vuelve a montar el shell, que
    // aún no ha hidratado, y vuelve a expulsar al usuario.
    conAuth({ isHydrated: false });

    montar();

    await waitFor(() => expect(screen.getByText(LOADER)).toBeInTheDocument());
    expect(replace).not.toHaveBeenCalled();
  });

  it("no pide nada al servidor antes de hidratar", async () => {
    conAuth({ isHydrated: false });

    montar();

    await waitFor(() => expect(screen.getByText(LOADER)).toBeInTheDocument());
    expect(restoreSessionFromServer).not.toHaveBeenCalled();
    expect(refreshProfile).not.toHaveBeenCalled();
  });

  it("no enseña el contenido protegido antes de hidratar", async () => {
    conAuth({ isHydrated: false });

    montar();

    expect(screen.queryByText(CONTENIDO)).toBeNull();
  });
});

describe("InternalProtectedShell · sin sesión local", () => {
  it("intenta recuperar la sesión del servidor antes de expulsar", async () => {
    // Modo cookie: no hay nada en el storage y aun así puede haber sesión viva.
    conAuth({ session: null });

    montar();

    await waitFor(() => expect(restoreSessionFromServer).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
  });

  it("si el servidor tampoco la reconoce, manda al login", async () => {
    conAuth({ session: null });
    restoreSessionFromServer.mockResolvedValue(null);

    montar();

    await waitFor(() => expect(replace).toHaveBeenCalled());
  });

  it("no enseña el contenido protegido mientras no hay sesión", () => {
    conAuth({ session: null });

    montar();

    expect(screen.queryByText(CONTENIDO)).toBeNull();
    expect(screen.getByText(LOADER)).toBeInTheDocument();
  });

  it("solo intenta recuperar la sesión una vez", async () => {
    // `restoredRef` evita el bucle recuperar -> fallar -> re-render -> recuperar.
    conAuth({ session: null });
    restoreSessionFromServer.mockResolvedValue(null);
    const { rerender } = render(
      <InternalProtectedShell>
        <p>{CONTENIDO}</p>
      </InternalProtectedShell>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalled());
    rerender(
      <InternalProtectedShell>
        <p>{CONTENIDO}</p>
      </InternalProtectedShell>,
    );

    expect(restoreSessionFromServer).toHaveBeenCalledTimes(1);
  });
});

describe("InternalProtectedShell · returnTo", () => {
  it("conserva la ruta actual para volver tras el login", async () => {
    conAuth({ session: null });
    restoreSessionFromServer.mockResolvedValue(null);

    montar("/internal/audit");

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/internal/login?returnTo=%2Finternal%2Faudit",
      ),
    );
  });

  it("conserva también la query, no solo el pathname", async () => {
    window.history.replaceState({}, "", "/internal/audit?page=2");
    conAuth({ session: null });
    restoreSessionFromServer.mockResolvedValue(null);

    montar("/internal/audit");

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/internal/login?returnTo=%2Finternal%2Faudit%3Fpage%3D2",
      ),
    );
  });

  it("un returnTo que apunta fuera del portal se descarta", async () => {
    // sanitizeInternalReturnTo rechaza el "//" protocol-relative; sin esto el
    // login se convertiría en una redirección abierta.
    window.history.replaceState({}, "", "/internal/x?next=//evil.example");
    conAuth({ session: null });
    restoreSessionFromServer.mockResolvedValue(null);

    montar("/internal/x");

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/internal/login?returnTo=%2Finternal",
      ),
    );
  });
});

describe("InternalProtectedShell · con sesión", () => {
  it("renderiza el contenido dentro del AppShell", () => {
    conAuth({ session: SESION });

    montar();

    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByText(CONTENIDO)).toBeInTheDocument();
  });

  it("revalida el perfil contra el servidor al entrar", async () => {
    // Los permisos del token pueden haber sido revocados desde el último login.
    conAuth({ session: SESION });

    montar();

    await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1));
  });

  it("si el perfil ya no es válido, manda al login", async () => {
    conAuth({ session: SESION });
    refreshProfile.mockResolvedValue(null);

    montar();

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/internal/login"),
    );
  });

  it("no revalida en cada render: una vez por montaje", async () => {
    conAuth({ session: SESION });
    const { rerender } = montar();
    await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1));

    rerender(
      <InternalProtectedShell>
        <p>{CONTENIDO}</p>
      </InternalProtectedShell>,
    );

    expect(refreshProfile).toHaveBeenCalledTimes(1);
  });
});

describe("InternalProtectedShell · página de login", () => {
  it("deja pasar el login sin sesión y sin AppShell", () => {
    // Envolver el login en el AppShell (sidebar + topbar) o exigirle sesión
    // dejaría al usuario sin forma de autenticarse.
    conAuth({ session: null });

    montar("/internal/login");

    expect(screen.getByText(CONTENIDO)).toBeInTheDocument();
    expect(screen.queryByTestId("app-shell")).toBeNull();
    expect(screen.queryByText(LOADER)).toBeNull();
  });

  it("no redirige desde el login: sería un bucle", async () => {
    conAuth({ session: null });

    montar("/internal/login");

    await Promise.resolve();
    expect(replace).not.toHaveBeenCalled();
  });

  it("no llama al servidor desde el login", async () => {
    conAuth({ session: null });

    montar("/internal/login");

    await Promise.resolve();
    expect(restoreSessionFromServer).not.toHaveBeenCalled();
    expect(refreshProfile).not.toHaveBeenCalled();
  });
});
