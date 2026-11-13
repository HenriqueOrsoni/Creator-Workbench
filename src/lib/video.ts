import type { VideoSnapshot } from "@/store/useAppStore";

/** Número no padrão pt-BR; "—" quando o valor não existe (YouTube pode ocultar curtidas/comentários). */
export function formatCount(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR");
}

/** Pontos "x,y" para a linha de visualizações (viewBox 100 x 32); y cresce para baixo. */
export function sparklinePoints(history: VideoSnapshot[], width = 100, height = 32): string {
  if (history.length < 2) return "";
  const values = history.map(h => h.viewCount);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
