/**
 * Lê o parâmetro ?redirect= (já codificado na URL) e só aceita caminhos internos do app.
 * Rejeita endereços externos ("//site.com", "https://...") e laços para /login e /registrar.
 */
export function getSafeRedirect(search: string, fallback = "/"): string {
  let raw: string | null = null;
  try {
    raw = new URLSearchParams(search).get("redirect");
  } catch {
    return fallback;
  }
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  const path = raw.split(/[?#]/)[0];
  if (path === "/login" || path === "/registrar") return fallback;
  return raw;
}

/** Monta a URL de login que volta para a página atual depois da autenticação. */
export function buildLoginUrl(pathname: string, search = ""): string {
  if (!pathname || pathname === "/") return "/login";
  return `/login?redirect=${encodeURIComponent(`${pathname}${search}`)}`;
}
