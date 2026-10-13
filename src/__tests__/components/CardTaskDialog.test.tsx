import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CardTaskDialog } from '@/components/shared/CardTaskDialog';
import { useAppStore, ProjectCard } from '@/store/useAppStore';

describe('Fase 2 - CardTaskDialog Component (Checklist & Progresso)', () => {
  const mockCreateTask = jest.fn();
  const mockToggleTask = jest.fn();
  const mockDeleteTask = jest.fn();

  const mockCard: ProjectCard = {
    id: '10',
    title: 'Projeto Vídeo Spring Boot',
    description: 'Gravar aula sobre JPA',
    type: 'PROJECT',
    sortOrder: 0,
    progress: 50,
    tasksTotal: 2,
    tasksDone: 1,
    tasks: [
      { id: '101', cardId: '10', title: 'Escrever roteiro', completed: true, sortOrder: 0, createdAt: new Date().toISOString() },
      { id: '102', cardId: '10', title: 'Gravar tela', completed: false, sortOrder: 1, createdAt: new Date().toISOString() },
    ],
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState({
      createTask: mockCreateTask,
      toggleTask: mockToggleTask,
      deleteTask: mockDeleteTask,
      board: {
        teamId: '1',
        teamName: 'Equipe',
        columns: [
          {
            id: 'col-1',
            name: 'Pesquisa',
            sortOrder: 0,
            cards: [mockCard],
          },
        ],
      },
    });
  });

  it('exibe título do card, tarefas e progresso calculado', () => {
    render(<CardTaskDialog card={mockCard} open={true} onOpenChange={() => {}} />);

    expect(screen.getByText('Projeto Vídeo Spring Boot')).toBeInTheDocument();
    expect(screen.getByText('1 de 2 tarefas concluídas')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Escrever roteiro')).toBeInTheDocument();
    expect(screen.getByText('Gravar tela')).toBeInTheDocument();
  });

  it('permite alternar status de conclusão da tarefa', async () => {
    render(<CardTaskDialog card={mockCard} open={true} onOpenChange={() => {}} />);

    const taskButton = screen.getByText('Gravar tela');
    await act(async () => {
      fireEvent.click(taskButton);
    });

    expect(mockToggleTask).toHaveBeenCalledWith('10', '102');
  });

  it('permite adicionar nova tarefa', async () => {
    render(<CardTaskDialog card={mockCard} open={true} onOpenChange={() => {}} />);

    const input = screen.getByPlaceholderText(/gravar áudio da intro/i);
    const addButton = screen.getByRole('button', { name: /adicionar/i });

    fireEvent.change(input, { target: { value: 'Editar cortes de áudio' } });

    await act(async () => {
      fireEvent.click(addButton);
    });

    expect(mockCreateTask).toHaveBeenCalledWith('10', 'Editar cortes de áudio');
  });
});
