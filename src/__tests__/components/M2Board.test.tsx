import React from 'react';
import { render, screen } from '@testing-library/react';
import { KanbanBoard } from '@/components/shared/KanbanBoard';
import { useAppStore, ProjectCard } from '@/store/useAppStore';

function card(id: string, title: string, extra: Partial<ProjectCard> = {}): ProjectCard {
  return {
    id, title, description: '', type: 'PROJECT', sortOrder: 0, progress: 0,
    tasksTotal: 0, tasksDone: 0, createdAt: '2026-11-01T10:00:00Z', ...extra,
  };
}

function seed(cards: ProjectCard[]) {
  useAppStore.setState({
    activeTeam: { id: 't1', name: 'Equipe', role: 'ADMIN', membersCount: 1, createdAt: 'x' },
    board: { teamId: 't1', teamName: 'Equipe', columns: [{ id: 'c1', name: 'Pesquisa', sortOrder: 0, cards }] },
    selectedProjectId: null,
  });
}

describe('M2: selos de revisão e de materiais no quadro', () => {
  it('APPROVED mostra "Aprovado"', () => {
    seed([card('1', 'P1', { reviewStatus: 'APPROVED' })]);
    render(<KanbanBoard />);
    expect(screen.getByText('Aprovado')).toBeInTheDocument();
    expect(screen.queryByText('Alterações solicitadas')).not.toBeInTheDocument();
  });

  it('CHANGES_REQUESTED mostra "Alterações solicitadas"', () => {
    seed([card('1', 'P1', { reviewStatus: 'CHANGES_REQUESTED' })]);
    render(<KanbanBoard />);
    expect(screen.getByText('Alterações solicitadas')).toBeInTheDocument();
    expect(screen.queryByText('Aprovado')).not.toBeInTheDocument();
  });

  it('NONE e materialsCount 0 não mostram nada', () => {
    seed([card('1', 'P1', { reviewStatus: 'NONE', materialsCount: 0 })]);
    render(<KanbanBoard />);
    expect(screen.queryByText('Aprovado')).not.toBeInTheDocument();
    expect(screen.queryByText('Alterações solicitadas')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Materiais anexados')).not.toBeInTheDocument();
  });

  it('materialsCount 1 mostra "1 material" e 3 mostra "3 materiais"', () => {
    seed([card('1', 'P1', { materialsCount: 1 }), card('2', 'P2', { materialsCount: 3 })]);
    render(<KanbanBoard />);
    expect(screen.getByText('1 material')).toBeInTheDocument();
    expect(screen.getByText('3 materiais')).toBeInTheDocument();
  });
});
