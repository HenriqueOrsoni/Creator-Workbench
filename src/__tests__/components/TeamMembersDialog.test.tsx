import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamMembersDialog } from '@/components/shared/TeamMembersDialog';
import { useAppStore, TeamMember } from '@/store/useAppStore';

describe('Fase 3 - TeamMembersDialog Component', () => {
  const mockFetchTeamMembers = jest.fn();
  const mockCreateTeamInvite = jest.fn().mockResolvedValue(true);
  const mockFetchTeamInvites = jest.fn();
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
      createTeamInvite: mockCreateTeamInvite,
      fetchTeamInvites: mockFetchTeamInvites,
      teamInvites: [],
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

  it('há uma única forma de adicionar pessoas: o convite por e-mail (sem formulário de adicionar membro)', async () => {
    render(<TeamMembersDialog open={true} onOpenChange={jest.fn()} />);

    expect(screen.queryByPlaceholderText(/e-mail do colaborador/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /adicionar membro/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /convites/i }));
    fireEvent.change(screen.getByPlaceholderText(/e-mail do convidado/i), { target: { value: 'novo@colaborador.com' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar convite por e-mail/i }));

    await waitFor(() => {
      expect(mockCreateTeamInvite).toHaveBeenCalledWith('novo@colaborador.com', 'CREATOR');
    });
  });
});
