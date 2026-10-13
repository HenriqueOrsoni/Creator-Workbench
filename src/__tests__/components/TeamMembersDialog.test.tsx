import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamMembersDialog } from '@/components/shared/TeamMembersDialog';
import { useAppStore, TeamMember } from '@/store/useAppStore';

describe('Fase 3 - TeamMembersDialog Component', () => {
  const mockFetchTeamMembers = jest.fn();
  const mockAddTeamMember = jest.fn().mockResolvedValue(true);
  const mockUpdateTeamMemberRole = jest.fn().mockResolvedValue(true);
  const mockRemoveTeamMember = jest.fn().mockResolvedValue(true);

  const mockMembers: TeamMember[] = [
    {
      id: 'm1',
      userId: 'u1',
      name: 'Henrique Orsoni',
      email: 'henrique@example.com',
      role: 'ADMIN',
      joinedAt: new Date().toISOString(),
    },
    {
      id: 'm2',
      userId: 'u2',
      name: 'Maria Silva',
      email: 'maria@example.com',
      role: 'CREATOR',
      joinedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState({
      activeTeam: {
        id: '10',
        name: 'Equipe de Produção',
        role: 'ADMIN',
        membersCount: 2,
        createdAt: new Date().toISOString(),
      },
      teamMembers: mockMembers,
      fetchTeamMembers: mockFetchTeamMembers,
      addTeamMember: mockAddTeamMember,
      updateTeamMemberRole: mockUpdateTeamMemberRole,
      removeTeamMember: mockRemoveTeamMember,
    });
  });

  it('renderiza membros da equipe quando o diálogo está aberto', () => {
    render(<TeamMembersDialog open={true} onOpenChange={jest.fn()} />);

    expect(screen.getByText('Henrique Orsoni')).toBeInTheDocument();
    expect(screen.getByText('maria@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('Administrador')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Criador')[0]).toBeInTheDocument();
  });

  it('permite que administradores convidem novo membro via formulário', async () => {
    render(<TeamMembersDialog open={true} onOpenChange={jest.fn()} />);

    const emailInput = screen.getByPlaceholderText(/e-mail do colaborador/i);
    fireEvent.change(emailInput, { target: { value: 'novo@colaborador.com' } });

    const submitBtn = screen.getByRole('button', { name: /adicionar membro/i });
    fireEvent.click(submitBtn);

    expect(mockAddTeamMember).toHaveBeenCalledWith('novo@colaborador.com', 'CREATOR');
  });
});
