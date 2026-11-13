/** Texto do status de revisão, o mesmo no quadro, no card e no histórico. */
export function reviewLabel(status?: string | null): string {
  if (status === "APPROVED") return "Aprovado";
  if (status === "CHANGES_REQUESTED") return "Alterações solicitadas";
  return "Pendente de revisão";
}
