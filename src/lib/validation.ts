import { z } from "zod";

/**
 * Creator Workbench - Validation Schemas (Zod)
 * Aplica as Regras de Negócio de validação (RN06).
 */

export const itemSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres."),
  description: z.string().optional(),
  module: z.string().min(1, "O módulo é obrigatório."),
});

/**
 * RN01/RN06 - Schema de Conversão e Atualização de Projeto
 */
export const conversionSchema = z.object({
  title: z.string().min(3, "O título do projeto deve ter pelo menos 3 caracteres."),
  targetAudience: z.string().min(3, "Público-alvo insuficiente."),
  pedagogicalObjective: z.string().min(10, "Objetivo pedagógico deve ser detalhado (mínimo 10 chars)."),
  state: z.enum(["IDEATION", "IN_PRODUCTION", "REVIEW", "DONE"]).optional(),
  progress: z.number().min(0).max(100).optional(),
});

export const projectUpdateSchema = z.object({
  title: z.string().min(3, "O título do projeto deve ter pelo menos 3 caracteres."),
  targetAudience: z.string().min(3, "Público-alvo insuficiente."),
  pedagogicalObjective: z.string().min(10, "Objetivo pedagógico deve ser detalhado (mínimo 10 chars)."),
  state: z.enum(["IDEATION", "IN_PRODUCTION", "REVIEW", "DONE"]),
  progress: z.number().min(0).max(100),
});

export type ConversionFormValues = z.infer<typeof conversionSchema>;
export type ProjectUpdateFormValues = z.infer<typeof projectUpdateSchema>;
