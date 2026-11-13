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
  // Caracteres de controle (tab, quebra de linha) e barra invertida: o navegador os remove ou troca e muda o destino
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return fallback;
  }
  if (url.origin !== origin) return fallback;
  // Segmentos "." e ".." são normalizados pelo parser e podem virar "//host"
  if (url.pathname.startsWith("//") || url.pathname.includes("\\")) return fallback;
  if (url.pathname === "/login" || url.pathname === "/registrar") return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Monta a URL de login que volta para a página atual depois da autenticação. */
export function buildLoginUrl(pathname: string, search = ""): string {
  if (!pathname || pathname === "/") return "/login";
  return `/login?redirect=${encodeURIComponent(`${pathname}${search}`)}`;
}


/** Link para outra tela de acesso (login/registrar) mantendo o ?redirect= atual, só se for seguro. */
export function withRedirect(path: string, search: string): string {
  const safe = getSafeRedirect(search);
  return safe === "/" ? path : `${path}?redirect=${encodeURIComponent(safe)}`;
}
