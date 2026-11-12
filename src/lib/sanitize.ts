import DOMPurify from "dompurify";

// Tags que o editor (TipTap StarterKit) produz; qualquer outra é removida.
const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "code", "pre", "blockquote",
  "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "a", "span",
];
const ALLOWED_ATTR = ["href", "target", "rel", "class"];

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Limpa o HTML antes de usar em dangerouslySetInnerHTML (conteúdo vem do servidor e pode ter sido
 * escrito por outro membro): remove scripts, eventos (onerror...), imagens, iframes e links perigosos.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  // Sem DOM (render no servidor) o DOMPurify não limpa: devolve o texto escapado
  if (!DOMPurify.isSupported) return escapeHtml(html);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  });
}
