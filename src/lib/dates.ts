/**
 * Datas AAAA-MM-DD (prazos) vêm sem horário. `new Date("2026-11-12")` interpreta como UTC
 * e pode mostrar o dia anterior no Brasil, então estas funções montam a data no fuso local.
 */
export function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function formatLocalDate(value?: string | null): string {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString("pt-BR") : "";
}

/** Dias entre hoje (00:00 local) e o prazo; negativo quando vencido. */
export function daysUntil(value?: string | null): number | null {
  const date = parseLocalDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}
