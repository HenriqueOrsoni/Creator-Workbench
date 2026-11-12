import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { KanbanBoard } from '@/components/shared/KanbanBoard';
import { useAppStore, ProjectCard, BoardColumn } from '@/store/useAppStore';

function card(id: string, title: string, extra: Partial<ProjectCard> = {}): ProjectCard {
  return {
    id,
    title,
    description: `Descrição de ${title}`,
    type: 'PROJECT',
    sortOrder: 0,
    progress: 0,
    tasksTotal: 0,
    tasksDone: 0,
    createdAt: '2026-11-01T10:00:00Z',
    ...extra,
  };
}

const columns: BoardColumn[] = [
  { id: 'c1', name: 'Pesquisa', sortOrder: 0, cards: [card('1', 'Projeto Pesquisa', { tag: 'Tutorial', tagColor: '#2E7D32', columnSince: '2026-11-10T14:00:00Z' })] },
  { id: 'c2', name: 'Roteiro', sortOrder: 1, cards: [card('2', 'Projeto Roteiro', { progress: 45, tasksTotal: 2, tasksDone: 1, dueDate: '2026-11-20' })] },
  { id: 'c3', name: 'Gravação', sortOrder: 2, cards: [card('3', 'Projeto Gravação')] },
  { id: 'c4', name: 'Edição', sortOrder: 3, cards: [card('4', 'Projeto Edição')] },
];

describe('4.3 Componentes do Kanban (FT-12 a FT-16)', () => {
  const mockMoveCard = jest.fn();
  const mockDeleteCard = jest.fn();
  const mockReorderColumns = jest.fn();
  const mockSetSelectedProjectId = jest.fn();

  function seed(role: 'ADMIN' | 'CREATOR' | 'REVIEWER' = 'ADMIN') {
    useAppStore.setState({
      activeTeam: { id: 't1', name: 'Equipe', role, membersCount: 1, createdAt: 'x' },
      board: { teamId: 't1', teamName: 'Equipe', columns },
      moveCard: mockMoveCard,
      deleteCard: mockDeleteCard,
      reorderColumns: mockReorderColumns,
      selectedProjectId: '2',
      setSelectedProjectId: mockSetSelectedProjectId,
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    seed();
  });

  it('FT-12: renderiza as colunas que vieram do servidor', () => {
    render(<KanbanBoard />);

    expect(screen.getByText('Pesquisa')).toBeInTheDocument();
    expect(screen.getByText('Roteiro')).toBeInTheDocument();
    expect(screen.getByText('Gravação')).toBeInTheDocument();
    expect(screen.getByText('Edição')).toBeInTheDocument();
  });

  it('FT-13: cards exibem título, descrição, progresso calculado e etiqueta', () => {
    render(<KanbanBoard />);

    expect(screen.getByText('Projeto Pesquisa')).toBeInTheDocument();
    expect(screen.getByText('Descrição de Projeto Roteiro')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('1/2 tarefas')).toBeInTheDocument();
    expect(screen.getByTitle('Etiqueta')).toHaveTextContent('Tutorial');
  });

  it('exibe "na coluna desde" a partir de columnSince', () => {
    render(<KanbanBoard />);
    expect(screen.getByText(/na coluna desde 10\/11\/2026/i)).toBeInTheDocument();
  });

  it('prazo AAAA-MM-DD aparece no mesmo dia (sem erro de fuso)', () => {
    render(<KanbanBoard />);
    expect(screen.getByText(/prazo 20\/11\/2026/i)).toBeInTheDocument();
  });

  it('BF-08: as setas ficam escondidas nas pontas do quadro', () => {
    render(<KanbanBoard />);

    // Primeira coluna não tem "anterior"; última não tem "próxima"
    expect(screen.getAllByTitle('Mover para coluna anterior')).toHaveLength(3);
    expect(screen.getAllByTitle('Mover para próxima coluna')).toHaveLength(3);
  });

  it('FT-15: seta para a direita chama moveCard com a coluna seguinte', async () => {
    render(<KanbanBoard />);

    const rightArrows = screen.getAllByTitle('Mover para próxima coluna');
    await act(async () => {
      fireEvent.click(rightArrows[0]);
    });
    expect(mockMoveCard).toHaveBeenCalledWith('1', 'c2');

    const leftArrows = screen.getAllByTitle('Mover para coluna anterior');
    await act(async () => {
      fireEvent.click(leftArrows[0]);
    });
    expect(mockMoveCard).toHaveBeenCalledWith('2', 'c1');
  });

  it('FE-06: excluir pede confirmação antes de chamar deleteCard', async () => {
    render(<KanbanBoard />);

    const deleteButtons = screen.getAllByTitle('Excluir item');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Confirmar Exclusão')).toBeInTheDocument();
    expect(mockDeleteCard).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sim, excluir/i }));
    });
    expect(mockDeleteCard).toHaveBeenCalledWith('1');
  });

  it('FT-16: badges mostram o número de cards por coluna', () => {
    render(<KanbanBoard />);
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(4);
  });

  it('Administrador reordena colunas pelas setas do cabeçalho (ADMIN)', async () => {
    render(<KanbanBoard />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Mover coluna Pesquisa para a direita'));
    });
    expect(mockReorderColumns).toHaveBeenCalledWith(['c2', 'c1', 'c3', 'c4']);
  });

  it('BF-07: Revisor não vê editar, excluir, mover card, mover coluna nem adicionar coluna', () => {
    seed('REVIEWER');
    render(<KanbanBoard />);

    expect(screen.queryByTitle('Excluir item')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Mover para próxima coluna')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Mover para coluna anterior')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Mover coluna/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /adicionar coluna/i })).not.toBeInTheDocument();
    // Mas continua vendo o conteúdo
    expect(screen.getByText('Projeto Pesquisa')).toBeInTheDocument();
  });

  it('Criador move e exclui cards, mas não gerencia colunas', () => {
    seed('CREATOR');
    render(<KanbanBoard />);

    expect(screen.getAllByTitle('Excluir item').length).toBeGreaterThan(0);
    expect(screen.getAllByTitle('Mover para próxima coluna').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/Mover coluna/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /adicionar coluna/i })).not.toBeInTheDocument();
  });
});
