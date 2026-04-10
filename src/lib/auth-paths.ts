/**
 * Rotas onde não exigimos perfil completo (login, callback OAuth, registo sem sessão).
 * `/register/complete` é para quem já tem sessão mas falta dados — não redirecionar para si próprio.
 */
export function isExemptFromRegistrationGate(
  pathname: string,
  hasUser: boolean
): boolean {
  if (pathname.startsWith("/auth/callback")) return true;
  if (pathname === "/register/complete") return true;
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (
    !hasUser &&
    (pathname === "/register" || pathname.startsWith("/register/"))
  ) {
    return true;
  }
  return false;
}
