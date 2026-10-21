import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { IdeasInbox } from '@/components/shared/IdeasInbox';
import { useAppStore, ProjectCard } from '@/store/useAppStore';

describe('Fase 2 - IdeasInbox Component (Caixa de Entrada)', () => {
  const mockFetchIdeas = jest.fn();
  const mockCreateInboxIdea = jest.fn();
  const mockConvertInboxIdea = jest.fn();
  const mockDeleteCard = jest.fn();

  const mockIdeas: ProjectCard[] = [
    {
      id: '50',
      title: 'Ideia sobre Micro-frontend',
      description: 'Pesquisar arquitetura baseada em Module Federation',
      type: 'IDEA',
      sortOrder: 0,
      progress: 0,
      tasksTotal: 0,
      tasksDone: 0,
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState({
      ideas: mockIdeas,
      board: {
        teamId: '1',
        teamName: 'Equipe',
        columns: [
          { id: 'col-1', name: 'Pesquisa', sortOrder: 0, cards: [] },
          { id: 'col-2', name: 'Roteiro', sortOrder: 1, cards: [] },
        ],
      },
      fetchIdeas: mockFetchIdeas,
      createInboxIdea: mockCreateInboxIdea,
      convertInboxIdea: mockConvertInboxIdea,
      deleteCard: mockDeleteCard,
    });
  });

  it('renderiza título e ideias presentes na Caixa de Entrada', () => {
    render(<IdeasInbox />);

    expect(screen.getByText('Caixa de Entrada • Inbox')).toBeInTheDocument();
    expect(screen.getByText('Ideia sobre Micro-frontend')).toBeInTheDocument();
    expect(screen.getByText('Pesquisar arquitetura baseada em Module Federation')).toBeInTheDocument();
  });

  it('exige público-alvo e objetivo pedagógico antes de converter (RN01)', async () => {
    render(<IdeasInbox />);

    fireEvent.click(screen.getByRole('button', { name: /converter em projeto/i }));

    const confirmButton = screen.getByRole('button', { name: /confirmar e mover ao quadro/i });
    expect(confirmButton).toBeDisabled();

    await act(async () => {
      fireEvent.click(confirmButton);
    });
    expect(mockConvertInboxIdea).not.toHaveBeenCalled();
  });

  it('abre diálogo de conversão e converte a ideia com os dados da RN01', async () => {
    mockConvertInboxIdea.mockResolvedValue(true);
    render(<IdeasInbox />);

    const convertButton = screen.getByRole('button', { name: /converter em projeto/i });
    fireEvent.click(convertButton);

    expect(screen.getByText('Ativar Projeto no Quadro')).toBeInTheDocument();
    expect(screen.getByText('Pesquisa')).toBeInTheDocument();

    fireEvent.change(screen.getAllByPlaceholderText('Ex: Iniciantes em CS').at(-1)!, {
      target: { value: 'Iniciantes' },
    });
    fireEvent.change(screen.getAllByPlaceholderText('Ex: Compreender BFS e DFS').at(-1)!, {
      target: { value: 'Entender BFS' },
    });

    const confirmButton = screen.getByRole('button', { name: /confirmar e mover ao quadro/i });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(mockConvertInboxIdea).toHaveBeenCalledWith('50', 'col-1', {
      targetAudience: 'Iniciantes',
      pedagogicalObjective: 'Entender BFS',
    });
  });
});
