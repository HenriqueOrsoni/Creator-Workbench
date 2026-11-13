import { clearPersistedTeam, deleteCookie } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

/**
 * Encerra a sessão neste navegador: limpa a store, a equipe guardada e os cookies.
 * Com `redirect`, o login volta para essa página (caminho interno) depois de entrar.
 */
export function logout(redirect?: string) {
  useAppStore.getState().resetStore();
  clearPersistedTeam();
  deleteCookie("creator_auth_token");
  deleteCookie("creator_user_id");
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
    window.location.href = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";
  }
}
