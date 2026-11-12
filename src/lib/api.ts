"use client";

// Helpers para gerenciamento de Cookies no Navegador
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

export function setCookie(name: string, value: string, maxAgeSeconds: number = 86400) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${secure}`;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export function handleUnauthorized() {
  deleteCookie("creator_auth_token");
  deleteCookie("creator_user_id");
  if (typeof window !== "undefined") {
    try {
      window.localStorage?.removeItem("creator_auth_token");
      window.sessionStorage?.removeItem("creator_auth_token");
    } catch {
      // Ignora restrições de sandbox/ambiente
    }
  }
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }
}

/** Erro de API: a mensagem é o {message} do servidor e `status` é o código HTTP. */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const errorData = await response.json();
    return errorData?.message || fallback;
  } catch {
    // Ignora falha de parsing se a resposta não for JSON
    return fallback;
  }
}

// Converte respostas de erro em exceções com a mensagem do servidor
async function throwIfError(response: Response, path: string) {
  if (response.ok) return;

  if (response.status === 401) {
    if (path.startsWith("/api/auth/")) {
      throw new ApiError(await readErrorMessage(response, "Credenciais inválidas. Verifique seu e-mail e senha."), 401);
    }
    handleUnauthorized();
    throw new ApiError("Sessão expirada. Redirecionando...", 401);
  }

  if (response.status === 403) {
    throw new ApiError(await readErrorMessage(response, "Acesso negado para esta operação."), 403);
  }

  throw new ApiError(await readErrorMessage(response, "Ocorreu um erro na requisição."), response.status);
}

function buildHeaders(withJsonContentType: boolean): Record<string, string> {
  const token = getCookie("creator_auth_token");
  const headers: Record<string, string> = {
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };
  if (withJsonContentType) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

// Função para chamadas genéricas à API
export async function apiRequest(method: string, path: string, body?: unknown) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders(!isFormData),
    body: isFormData ? (body as FormData) : (body !== undefined ? JSON.stringify(body) : undefined),
  });

  await throwIfError(response, path);

  if (response.status === 204) return null;
  return response.json();
}

/**
 * Baixa um arquivo com o token no cabeçalho (fetch + blob) e dispara o download no navegador.
 * Um link simples (<a href>) não envia o token, por isso não serve para rotas protegidas.
 */
export async function apiDownload(path: string, fallbackFileName: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: buildHeaders(false),
  });

  await throwIfError(response, path);

  const blob = await response.blob();
  let fileName = fallbackFileName;
  const disposition = response.headers?.get?.("Content-Disposition");
  const match = disposition ? /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition) : null;
  if (match) {
    try {
      fileName = decodeURIComponent(match[1]);
    } catch {
      fileName = match[1];
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
