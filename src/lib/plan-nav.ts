"use client";

import { toast } from "sonner";

const OPEN_PLAN_EVENT = "cw:open-plan";

/** Pede à página principal para abrir a aba "Plano". */
export function requestPlanPage() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_PLAN_EVENT));
}

export function onPlanPageRequest(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(OPEN_PLAN_EVENT, handler);
  return () => window.removeEventListener(OPEN_PLAN_EVENT, handler);
}

/**
 * Caminho central dos erros da API na tela: mostra a mensagem do servidor.
 * 402 (limite do plano) ganha a ação "Ver planos".
 */
export function toastApiError(error: unknown, fallback: string) {
  const message = error instanceof Error && error.message ? error.message : fallback;
  if ((error as { status?: number } | null)?.status === 402) {
    toast.error(message, { action: { label: "Ver planos", onClick: requestPlanPage } });
    return;
  }
  toast.error(message);
}
