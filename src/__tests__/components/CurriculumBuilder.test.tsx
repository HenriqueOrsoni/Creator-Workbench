import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CurriculumBuilder } from '@/components/shared/CurriculumBuilder';
import * as apiModule from '@/lib/api';

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiRequest: jest.fn(),
}));

describe('TF-08 - CurriculumBuilder Component Tests', () => {
  const mockModules = [
    {
      id: 1,
      title: 'Módulo 1: Fundamentos',
      lessons: [
        {
          id: 101,
          title: 'Aula 1.1: Introdução ao Conceito',
          type: 'VIDEO',
          published: true,
        },
        {
          id: 102,
          title: 'Aula 1.2: Questionário de Fixação',
          type: 'QUIZ',
          published: false,
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (apiModule.apiRequest as jest.Mock).mockImplementation((method, path) => {
      if (method === 'GET' && path.includes('/curriculum/modules')) {
        return Promise.resolve(mockModules);
      }
      return Promise.resolve({ success: true });
    });
  });

  it('busca e renderiza a grade de módulos ao inicializar', async () => {
    render(<CurriculumBuilder kanbanItemId="10" courseTitle="Curso de TypeScript" />);

    await waitFor(() => {
      expect(apiModule.apiRequest).toHaveBeenCalledWith('GET', '/api/v1/kanban/10/curriculum/modules');
      expect(screen.getByText('Módulo 1: Fundamentos')).toBeInTheDocument();
      expect(screen.getByText(/2 aulas planejadas/i)).toBeInTheDocument();
    });
  });

  it('permite abrir o diálogo para adicionar um novo módulo', async () => {
    render(<CurriculumBuilder kanbanItemId="10" courseTitle="Curso de TypeScript" />);

    await waitFor(() => {
      expect(screen.getByText('Módulo 1: Fundamentos')).toBeInTheDocument();
    });

    const addModuleBtn = screen.getByRole('button', { name: /novo_módulo/i });
    fireEvent.click(addModuleBtn);

    expect(screen.getByPlaceholderText(/módulo 01 - fundamentos/i)).toBeInTheDocument();
  });

  it('permite expandir o módulo para visualizar as aulas', async () => {
    render(<CurriculumBuilder kanbanItemId="10" courseTitle="Curso de TypeScript" />);

    await waitFor(() => {
      expect(screen.getByText('Módulo 1: Fundamentos')).toBeInTheDocument();
    });

    const moduleTrigger = screen.getByText('Módulo 1: Fundamentos');
    fireEvent.click(moduleTrigger);

    await waitFor(() => {
      expect(screen.getByText('Aula 1.1: Introdução ao Conceito')).toBeInTheDocument();
      expect(screen.getByText('Aula 1.2: Questionário de Fixação')).toBeInTheDocument();
    });
  });
});
