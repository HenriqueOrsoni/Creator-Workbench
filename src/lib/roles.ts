export type TeamRole = "ADMIN" | "CREATOR" | "REVIEWER";

export function formatRole(role?: string | null): string {
  switch (role) {
    case "ADMIN":
      return "Administrador";
    case "CREATOR":
      return "Criador";
    case "REVIEWER":
      return "Revisor";
    default:
      return role || "";
  }
}

/** Equipe: membros, convites, renomear e excluir a equipe. */
export function canManageTeam(role?: string | null): boolean {
  return role === "ADMIN";
}

/** Colunas do quadro: somente o Administrador cria, renomeia, remove e reordena. */
export function canManageColumns(role?: string | null): boolean {
  return role === "ADMIN";
}

/** Etiquetas: somente o Administrador cria, renomeia, muda a cor e remove (usar é de quem edita). */
export function canManageTags(role?: string | null): boolean {
  return role === "ADMIN";
}

/** Decisão de revisão do card: Administrador e Revisor. */
export function canReviewCards(role?: string | null): boolean {
  return role === "ADMIN" || role === "REVIEWER";
}

export function canEditProduction(role?: string | null): boolean {
  // Sem papel (sem equipe ativa) é somente leitura; REVIEWER também.
  if (!role) return false;
  return role === "ADMIN" || role === "CREATOR";
}
