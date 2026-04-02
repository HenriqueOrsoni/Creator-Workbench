import { z } from "zod";

/**
 * Creator Workbench - Validation Schemas (Zod)
 * Aplica as Regras de Negócio de validação (RN06).
 */

// REGEX para validação de plataforma (Youtube ou LMS padrão)
const platformLinkRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|hotmart\.com|kajabi\.com)\/.+$/;

export const itemSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres."),
  description: z.string().optional(),
  module: z.string().min(1, "O módulo é obrigatório."),
});

/**
 * RN01/RN06 - Schema de Aprovação e Publicação
 */
export const conversionSchema = z.object({
  title: z.string().min(3, "O título do projeto deve ter pelo menos 3 caracteres."),
  targetAudience: z.string().min(3, "Público-alvo insuficiente."),
  pedagogicalGoal: z.string().min(10, "Objetivo pedagógico deve ser detalhado (mínimo 10 chars)."),
});

export const publicationSchema = z.object({
  platformLink: z.string().regex(platformLinkRegex, "Link de plataforma inválido (YouTube/Vimeo/LMS)."), // RN06
});

export type ConversionFormValues = z.infer<typeof conversionSchema>;
export type PublicationFormValues = z.infer<typeof publicationSchema>;
