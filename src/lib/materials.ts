import type { MaterialItem } from "@/store/useAppStore";

const PREVIEW_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"];
const PREVIEW_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp", "gif"];

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.substring(dot + 1).toLowerCase() : "";
}

/** Só PDF e imagens abrem no navegador; os outros tipos têm apenas download. */
export function isPreviewable(m: Pick<MaterialItem, "fileName" | "contentType">): boolean {
  const type = (m.contentType || "").split(";")[0].trim().toLowerCase();
  if (type) return PREVIEW_TYPES.includes(type);
  return PREVIEW_EXTENSIONS.includes(extensionOf(m.fileName));
}

/** Tipo curto para a lista: extensão em maiúsculas (PDF, DOCX) ou, sem extensão, derivado do contentType. */
export function materialTypeLabel(m: Pick<MaterialItem, "fileName" | "contentType">): string {
  const ext = extensionOf(m.fileName);
  if (ext) return ext.toUpperCase();
  const sub = (m.contentType || "").split(";")[0].split("/")[1];
  return sub ? sub.toUpperCase() : "Arquivo";
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1).replace(".", ",")} MB`;
}

export function formatUploadDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

/** Linha de metadados: tipo, tamanho, quem enviou e quando. */
export function materialMeta(m: MaterialItem): string {
  const parts = [materialTypeLabel(m), formatFileSize(m.sizeBytes), `Por ${m.uploadedBy?.name || "Membro"}`];
  const date = formatUploadDate(m.createdAt);
  if (date) parts.push(date);
  return parts.filter(Boolean).join(" • ");
}
