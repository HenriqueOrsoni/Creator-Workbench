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

export function canManageTeam(role?: string | null): boolean {
  return role === "ADMIN";
}

export function canEditProduction(role?: string | null): boolean {
  // Se não houver equipe ativa (modo legado/individual), permite edição.
  // Dentro de equipe, apenas ADMIN e CREATOR podem editar; REVIEWER é somente leitura.
  if (!role) return true;
  return role === "ADMIN" || role === "CREATOR";
}

