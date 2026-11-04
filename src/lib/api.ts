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

// Função para chamadas genéricas à API
export async function apiRequest(method: string, path: string, body?: unknown) {
  const token = getCookie("creator_auth_token");
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const headers: Record<string, string> = {
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : (body !== undefined ? JSON.stringify(body) : undefined),
  });

  if (response.status === 401) {
    if (path.startsWith("/api/auth/")) {
      let errorMessage = "Credenciais inválidas. Verifique seu e-mail e senha.";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Ignora falha de parsing
      }
      throw new Error(errorMessage);
    }

    handleUnauthorized();
    throw new Error("Sessão expirada. Redirecionando...");
  }

  if (response.status === 403) {
    let errorMessage = "Acesso negado para esta operação.";
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Ignora falha de parsing se a resposta não for JSON
    }
    throw new Error(errorMessage);
  }

  if (!response.ok) {
    let errorMessage = "Ocorreu um erro na requisição.";
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Ignora falha de parsing se a resposta não for JSON
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) return null;
  return response.json();
}
