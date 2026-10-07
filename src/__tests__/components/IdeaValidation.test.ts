import { conversionSchema, itemSchema } from '@/lib/validation';

describe('4.3 Validação de Conversão de Ideias e Regras Zod (FT-17)', () => {
  // FT-17: IdeaDialog valida campos de conversão (Zod)
  it('FT-17: conversionSchema rejeita quando targetAudience ou pedagogicalObjective estão ausentes', () => {
    const invalidData = {
      title: 'Projeto Válido',
      targetAudience: '',
      pedagogicalObjective: '',
    };

    const result = conversionSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.targetAudience).toBeDefined();
      expect(fieldErrors.pedagogicalObjective).toBeDefined();
    }
  });

  it('FT-17: conversionSchema rejeita pedagogicalObjective com menos de 10 caracteres (RN01)', () => {
    const invalidObjective = {
      title: 'Projeto Completo',
      targetAudience: 'Estudantes',
      pedagogicalObjective: 'Curto', // menos de 10 caracteres
    };

    const result = conversionSchema.safeParse(invalidObjective);
    expect(result.success).toBe(false);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.pedagogicalObjective).toContain(
        'Objetivo pedagógico deve ser detalhado (mínimo 10 chars).'
      );
    }
  });

  it('FT-17: conversionSchema aceita dados completos e válidos', () => {
    const validData = {
      title: 'Curso Completo de APIs RESTful',
      targetAudience: 'Desenvolvedores Junior e Pleno',
      pedagogicalObjective: 'Capacitar os alunos na criação e consumo de APIs HTTP com JWT.',
      state: 'IN_PRODUCTION' as const,
      progress: 0,
    };

    const result = conversionSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('FT-17: itemSchema valida criação de ideia com título mínimo de 3 caracteres', () => {
    const shortTitle = {
      title: 'Oi',
      module: 'Módulo 1',
    };

    const result = itemSchema.safeParse(shortTitle);
    expect(result.success).toBe(false);
  });
});
