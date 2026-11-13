"use client";

import { PREVIEW_TYPES } from "@/lib/materials";

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

/** Esquece a equipe ativa guardada no navegador (a próxima sessão escolhe pelas equipes do usuário). */
export function clearPersistedTeam() {
  if (typeof window === "undefined") return;
  try {
    const key = "creator-workbench-storage";
    const raw = window.localStorage?.getItem(key);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved?.state && "activeTeamId" in saved.state) {
      saved.state.activeTeamId = null;
      window.localStorage.setItem(key, JSON.stringify(saved));
    }
  } catch {
    // Ignora restrições de sandbox/ambiente
  }
}

// Ganchos que a store registra (a store importa este módulo, então não dá para importá-la aqui)
let onUnauthorizedHook: (() => void) | null = null;
let onWriteHook: (() => void) | null = null;

export function registerApiHooks(hooks: { onUnauthorized?: () => void; onWrite?: () => void }) {
  onUnauthorizedHook = hooks.onUnauthorized ?? null;
  onWriteHook = hooks.onWrite ?? null;
}

export function handleUnauthorized() {
  // Limpa também a equipe ativa em memória, senão o persist a grava de volta
  onUnauthorizedHook?.();
  deleteCookie("creator_auth_token");
  deleteCookie("creator_user_id");
  clearPersistedTeam();
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

export const NETWORK_ERROR_MESSAGE = "Não foi possível conectar ao servidor. Verifique sua conexão.";

// Falha de rede (servidor fora do ar, sem internet, CORS): mensagem em português
async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
  }
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

// Leituras (GET) idênticas e simultâneas compartilham a mesma requisição
const inFlightGets = new Map<string, Promise<unknown>>();

// Função para chamadas genéricas à API
export interface ApiRequestOptions {
  /** Progresso real do envio (0 a 100) para corpos FormData; usa XMLHttpRequest. */
  onUploadProgress?: (percent: number) => void;
}

export async function apiRequest(method: string, path: string, body?: unknown, options?: ApiRequestOptions) {
  if (method === "GET" && body === undefined) {
    const key = `${getCookie("creator_auth_token") ?? ""}|${path}`;
    const pending = inFlightGets.get(key);
    if (pending) return pending;
    const request = performRequest(method, path, body).finally(() => {
      inFlightGets.delete(key);
    });
    inFlightGets.set(key, request);
    return request;
  }
  // Depois de uma escrita nenhuma leitura em andamento vale mais: a próxima vai ao servidor
  inFlightGets.clear();
  onWriteHook?.();
  return performRequest(method, path, body, options);
}

function messageFromBody(text: string, fallback: string): string {
  try {
    return JSON.parse(text)?.message || fallback;
  } catch {
    return fallback;
  }
}

/** Envio com XMLHttpRequest para ter o progresso real; mesmos cabeçalhos e mesmo tratamento de erros do fetch. */
function performUpload(method: string, path: string, body: FormData, onProgress: (percent: number) => void): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${API_BASE_URL}${path}`);
    for (const [name, value] of Object.entries(buildHeaders(false))) {
      xhr.setRequestHeader(name, value);
    }
    xhr.responseType = "text";
    xhr.upload.onprogress = (event: ProgressEvent) => {
      if (event.lengthComputable && event.total > 0) {
        // Nunca chega a 100% antes da resposta de sucesso
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    };
    const networkError = () => reject(new ApiError(NETWORK_ERROR_MESSAGE, 0));
    xhr.onerror = networkError;
    xhr.onabort = networkError;
    xhr.ontimeout = networkError;
    xhr.onload = () => {
      const status = xhr.status;
      const text = typeof xhr.responseText === "string" ? xhr.responseText : "";
      if (status >= 200 && status < 300) {
        onProgress(100);
        if (status === 204 || !text) return resolve(null);
        try {
          return resolve(JSON.parse(text));
        } catch {
          return resolve(null);
        }
      }
      if (status === 401) {
        handleUnauthorized();
        return reject(new ApiError("Sessão expirada. Redirecionando...", 401));
      }
      const fallback = status === 403 ? "Acesso negado para esta operação." : "Ocorreu um erro na requisição.";
      reject(new ApiError(messageFromBody(text, fallback), status));
    };
    xhr.send(body);
  });
}

async function performRequest(method: string, path: string, body?: unknown, options?: ApiRequestOptions) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (isFormData && options?.onUploadProgress) {
    return performUpload(method, path, body as FormData, options.onUploadProgress);
  }

  const response = await safeFetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders(!isFormData),
    body: isFormData ? (body as FormData) : (body !== undefined ? JSON.stringify(body) : undefined),
  });

  await throwIfError(response, path);

  if (response.status === 204) return null;
  return response.json();
}

/** Nome do arquivo do cabeçalho Content-Disposition (filename* tem prioridade sobre filename). */
export function fileNameFromDisposition(disposition?: string | null): string | null {
  if (!disposition) return null;
  const star = /filename\*\s*=\s*[\w-]*'[^']*'([^;]+)/i.exec(disposition);
  if (star) {
    const raw = star[1].trim().replace(/^"|"$/g, "");
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  const plain = /filename\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^;]+))/i.exec(disposition);
  if (plain) return (plain[1] ?? plain[2]).trim();
  return null;
}

/**
 * Baixa um arquivo com o token no cabeçalho (fetch + blob) e dispara o download no navegador.
 * Um link simples (<a href>) não envia o token, por isso não serve para rotas protegidas.
 */
async function fetchBlob(path: string, fallbackFileName: string): Promise<{ blob: Blob; fileName: string }> {
  const response = await safeFetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: buildHeaders(false),
  });

  await throwIfError(response, path);

  const blob = await response.blob();
  const fileName = fileNameFromDisposition(response.headers?.get?.("Content-Disposition")) ?? fallbackFileName;
  return { blob, fileName };
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function apiDownload(path: string, fallbackFileName: string): Promise<void> {
  const { blob, fileName } = await fetchBlob(path, fallbackFileName);
  saveBlob(blob, fileName);
}

/**
 * Abre um arquivo em outra aba (GET ...?inline=true com o token no cabeçalho, via blob).
 * Se o navegador bloquear a nova aba, cai no download. Devolve "opened" ou "downloaded".
 */
export async function apiOpenInline(path: string, fallbackFileName: string): Promise<"opened" | "downloaded"> {
  const { blob, fileName } = await fetchBlob(`${path}${path.includes("?") ? "&" : "?"}inline=true`, fallbackFileName);
  // Segunda verificação: um blob: roda na origem do app, então só tipos de prévia seguros são abertos
  const blobType = (blob.type || "").split(";")[0].trim().toLowerCase();
  if (!PREVIEW_TYPES.includes(blobType)) {
    saveBlob(blob, fileName);
    return "downloaded";
  }
  const url = URL.createObjectURL(blob);
  // Sem a opção "noopener" no window.open (ela faz o retorno ser sempre null e esconderia o bloqueio de pop-up)
  const opened = window.open(url, "_blank");
  if (opened) {
    opened.opener = null;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return "opened";
  }
  URL.revokeObjectURL(url);
  saveBlob(blob, fileName);
  return "downloaded";
}
