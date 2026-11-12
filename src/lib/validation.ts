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
  pedagogicalObjective: z.string().min(10, "Objetivo pedagógico deve ser detalhado (mínimo de 10 caracteres)."),
  dueDate: z.string().optional(),
});

// Estado e progresso não são mais editados: a coluna define o estado e o progresso vem das tarefas
export const projectUpdateSchema = z.object({
  title: z.string().min(3, "O título do projeto deve ter pelo menos 3 caracteres."),
  targetAudience: z.string().min(3, "Público-alvo insuficiente."),
  pedagogicalObjective: z.string().min(10, "Objetivo pedagógico deve ser detalhado (mínimo de 10 caracteres)."),
  dueDate: z.string().optional(),
});

export type ConversionFormValues = z.infer<typeof conversionSchema>;
export type ProjectUpdateFormValues = z.infer<typeof projectUpdateSchema>;
