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
      activeTeam: { id: 't1', name: 'Equipe', role: 'ADMIN', membersCount: 1, createdAt: 'x' },
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

  describe('edição de tarefa, histórico e papéis', () => {
    const mockUpdateDetails = jest.fn();
    const mockReorder = jest.fn();
    const mockHistory = jest.fn();
    const mockDownload = jest.fn();

    function seed(role: 'ADMIN' | 'CREATOR' | 'REVIEWER') {
      useAppStore.setState({
        activeTeam: { id: 't1', name: 'Equipe', role, membersCount: 2, createdAt: 'x' },
        teamMembers: [
          { id: '21', userId: '4', name: 'Ana Souza', email: 'ana@x.com', role: 'CREATOR', joinedAt: 'x' },
        ],
        updateCardTaskDetails: mockUpdateDetails,
        reorderCardTasks: mockReorder,
        fetchCardHistory: mockHistory,
        downloadMaterial: mockDownload,
        fetchCardMaterials: jest.fn().mockResolvedValue([]),
        cardMaterials: {
          '10': [{ id: '77', cardId: '10', fileName: 'apostila.pdf', contentType: 'application/pdf', sizeBytes: 2048, createdAt: 'x' }],
        },
      });
    }

    beforeEach(() => {
      seed('CREATOR');
      mockHistory.mockResolvedValue([]);
    });

    it('define o responsável escolhendo um membro da equipe (memberId)', async () => {
      render(<CardTaskDialog card={mockCard} open={true} onOpenChange={() => {}} />);

      await act(async () => {
        fireEvent.change(screen.getByLabelText('Responsável pela tarefa Gravar tela'), { target: { value: '21' } });
      });
      expect(mockUpdateDetails).toHaveBeenCalledWith('10', '102', { assigneeMemberId: 21 });

      await act(async () => {
        fireEvent.change(screen.getByLabelText('Responsável pela tarefa Gravar tela'), { target: { value: '0' } });
      });
      expect(mockUpdateDetails).toHaveBeenCalledWith('10', '102', { assigneeMemberId: 0 });
    });

    it('salva o prazo só ao sair do campo e só com data completa', async () => {
      render(<CardTaskDialog card={mockCard} open={true} onOpenChange={() => {}} />);
      const input = screen.getByLabelText('Prazo da tarefa Gravar tela');

      // Digitar (onChange) não envia nada
      fireEvent.change(input, { target: { value: '2026-11-18' } });
      expect(mockUpdateDetails).not.toHaveBeenCalled();

      await act(async () => {
        fireEvent.blur(input);
      });
      expect(mockUpdateDetails).toHaveBeenCalledWith('10', '102', { dueDate: '2026-11-18' });
    });

    it('data incompleta (campo vazio ao sair) não apaga o prazo', async () => {
      render(<CardTaskDialog card={mockCard} open={true} onOpenChange={() => {}} />);
      const input = screen.getByLabelText('Prazo da tarefa Gravar tela');

      await act(async () => {
        fireEvent.blur(input);
      });
      expect(mockUpdateDetails).not.toHaveBeenCalled();
    });

    it('remove o prazo só pelo botão explícito "Remover prazo"', async () => {
      const card = { ...mockCard, tasks: [{ ...mockCard.tasks![1], dueDate: '2026-11-12' }] };
      useAppStore.setState({ board: { teamId: '1', teamName: 'Equipe', columns: [{ id: 'c', name: 'Pesquisa', sortOrder: 0, cards: [card] }] } });
      render(<CardTaskDialog card={card} open={true} onOpenChange={() => {}} />);

      await act(async () => {
        fireEvent.click(screen.getByLabelText('Remover prazo da tarefa Gravar tela'));
      });
      expect(mockUpdateDetails).toHaveBeenCalledWith('10', '102', { dueDate: '' });
    });

    it('edita o título da tarefa: Enter salva, Esc cancela, sem mudança não envia', async () => {
      render(<CardTaskDialog card={mockCard} open={true} onOpenChange={() => {}} />);

      fireEvent.click(screen.getByLabelText('Editar título da tarefa Gravar tela'));
      let input = screen.getByLabelText('Título da tarefa Gravar tela');
      fireEvent.change(input, { target: { value: 'Gravar tela inteira' } });
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter' });
      });
      expect(mockUpdateDetails).toHaveBeenCalledWith('10', '102', { title: 'Gravar tela inteira' });

      mockUpdateDetails.mockClear();
      fireEvent.click(screen.getByLabelText('Editar título da tarefa Gravar tela'));
      input = screen.getByLabelText('Título da tarefa Gravar tela');
      fireEvent.change(input, { target: { value: 'Outro nome' } });
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(mockUpdateDetails).not.toHaveBeenCalled();
      expect(screen.queryByLabelText('Título da tarefa Gravar tela')).not.toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Editar título da tarefa Gravar tela'));
      await act(async () => {
        fireEvent.blur(screen.getByLabelText('Título da tarefa Gravar tela'));
      });
      expect(mockUpdateDetails).not.toHaveBeenCalled();
    });

    it('Enter seguido de blur salva uma única vez; Esc seguido de blur não salva', async () => {
      render(<CardTaskDialog card={mockCard} open={true} onOpenChange={() => {}} />);

      fireEvent.click(screen.getByLabelText('Editar título da tarefa Gravar tela'));
      let input = screen.getByLabelText('Título da tarefa Gravar tela');
      fireEvent.change(input, { target: { value: 'Título novo' } });
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter' });
        fireEvent.blur(input);
      });
      expect(mockUpdateDetails).toHaveBeenCalledTimes(1);
      expect(mockUpdateDetails).toHaveBeenCalledWith('10', '102', { title: 'Título novo' });

      mockUpdateDetails.mockClear();
      fireEvent.click(screen.getByLabelText('Editar título da tarefa Gravar tela'));
      input = screen.getByLabelText('Título da tarefa Gravar tela');
      fireEvent.change(input, { target: { value: 'Cancelado' } });
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Escape' });
        fireEvent.blur(input);
      });
      expect(mockUpdateDetails).not.toHaveBeenCalled();
    });

    it('Revisor não vê a edição de título', () => {
      seed('REVIEWER');
      render(<CardTaskDialog card={mockCard} open={true} onOpenChange={() => {}} />);
      expect(screen.queryByLabelText('Editar título da tarefa Gravar tela')).not.toBeInTheDocument();
    });

    it('mostra o prazo da tarefa no mesmo dia (sem erro de fuso)', () => {
      const card = { ...mockCard, tasks: [{ ...mockCard.tasks![1], dueDate: '2026-11-12' }] };
      useAppStore.setState({ board: { teamId: '1', teamName: 'Equipe', columns: [{ id: 'c', name: 'Pesquisa', sortOrder: 0, cards: [card] }] } });
      render(<CardTaskDialog card={card} open={true} onOpenChange={() => {}} />);

      expect(screen.getByText('12/11/2026')).toBeInTheDocument();
    });

    it('reordena com as setas enviando a nova ordem dos ids', async () => {
      render(<CardTaskDialog card={mockCard} open={true} onOpenChange={() => {}} />);

      await act(async () => {
        fireEvent.click(screen.getByLabelText('Mover tarefa Gravar tela para cima'));
      });
      expect(mockReorder).toHaveBeenCalledWith('10', ['102', '101']);
      // A primeira tarefa não tem seta para cima habilitada
      expect(screen.getByLabelText('Mover tarefa Escrever roteiro para cima')).toBeDisabled();
    });

    it('aba Histórico mostra "Carregando" enquanto busca e depois a lista da API', async () => {
      let resolve: (v: unknown) => void = () => {};
      mockHistory.mockReturnValue(new Promise(r => { resolve = r; }));
      render(<CardTaskDialog card={mockCard} open={true} onOpenChange={() => {}} />);

      await act(async () => {
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Histórico' }));
        fireEvent.click(screen.getByRole('tab', { name: 'Histórico' }));
      });
      expect(screen.getByText('Carregando histórico...')).toBeInTheDocument();

      await act(async () => {
        resolve([{ columnId: '2', columnName: 'Roteiro', enteredAt: '2026-11-10T14:00:00Z', movedBy: { userId: '4', name: 'Ana Souza' } }]);
      });
      expect(screen.queryByText('Carregando histórico...')).not.toBeInTheDocument();
      expect(screen.getByText(/Movido para/)).toBeInTheDocument();
      expect(screen.getByText('Por Ana Souza')).toBeInTheDocument();
    });

    it('baixar material usa downloadMaterial (fetch + blob com token), não um link direto', async () => {
      render(<CardTaskDialog card={mockCard} open={true} onOpenChange={() => {}} />);

      await act(async () => {
        fireEvent.mouseDown(screen.getByRole('tab', { name: /Materiais/ }));
        fireEvent.click(screen.getByRole('tab', { name: /Materiais/ }));
      });
      const button = screen.getByLabelText('Baixar apostila.pdf');
      expect(button.tagName).toBe('BUTTON');
      expect(button).not.toHaveAttribute('href');

      await act(async () => {
        fireEvent.click(button);
      });
      expect(mockDownload).toHaveBeenCalledWith(expect.objectContaining({ id: '77', fileName: 'apostila.pdf' }));
    });

    it('BF-07: Revisor não edita, move, exclui nem adiciona tarefas, mas pode marcar tarefas e decidir a revisão', async () => {
      seed('REVIEWER');
      render(<CardTaskDialog card={mockCard} open={true} onOpenChange={() => {}} />);

      expect(screen.queryByLabelText('Prazo da tarefa Gravar tela')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Responsável pela tarefa Gravar tela')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Mover tarefa Gravar tela para cima')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Excluir tarefa')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/gravar áudio da intro/i)).not.toBeInTheDocument();

      // Marcar tarefa continua permitido para qualquer membro (rota do servidor aceita Revisor)
      await act(async () => {
        fireEvent.click(screen.getByText('Gravar tela'));
      });
      expect(mockToggleTask).toHaveBeenCalledWith('10', '102');

      await act(async () => {
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Revisão' }));
        fireEvent.click(screen.getByRole('tab', { name: 'Revisão' }));
      });
      expect(screen.getByRole('button', { name: /registrar decisão de revisão/i })).toBeInTheDocument();
    });

    it('Criador não vê a decisão de revisão', async () => {
      render(<CardTaskDialog card={mockCard} open={true} onOpenChange={() => {}} />);

      await act(async () => {
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Revisão' }));
        fireEvent.click(screen.getByRole('tab', { name: 'Revisão' }));
      });
      expect(screen.queryByRole('button', { name: /registrar decisão de revisão/i })).not.toBeInTheDocument();
    });
  });
});
