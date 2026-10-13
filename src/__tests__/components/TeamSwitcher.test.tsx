import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TeamSwitcher } from '@/components/shared/TeamSwitcher';
import { useAppStore } from '@/store/useAppStore';

describe('Fase 2 - TeamSwitcher Component', () => {
  const mockFetchTeams = jest.fn();
  const mockSetActiveTeamId = jest.fn();
  const mockCreateTeam = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState({
      teams: [
        {
          id: '1',
          name: 'Equipe Pessoal',
          role: 'ADMIN',
          membersCount: 1,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Laboratório Criativo',
          role: 'CREATOR',
          membersCount: 3,
          createdAt: new Date().toISOString(),
        },
      ],
      activeTeamId: '1',
      activeTeam: {
        id: '1',
        name: 'Equipe Pessoal',
        role: 'ADMIN',
        membersCount: 1,
        createdAt: new Date().toISOString(),
      },
      fetchTeams: mockFetchTeams,
      setActiveTeamId: mockSetActiveTeamId,
      createTeam: mockCreateTeam,
    });
  });

  it('exibe o nome da equipe ativa e sua role no botão seletor', () => {
    render(<TeamSwitcher />);

    expect(screen.getByText('Equipe Pessoal')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('abre diálogo de seleção ao clicar no botão da equipe', () => {
    render(<TeamSwitcher />);

    const button = screen.getByRole('button', { name: /equipe pessoal/i });
    fireEvent.click(button);

    expect(screen.getByText('Equipes & Colaboração')).toBeInTheDocument();
    expect(screen.getByText('Laboratório Criativo')).toBeInTheDocument();
  });

  it('permite alternar para outra equipe', async () => {
    render(<TeamSwitcher />);

    const button = screen.getByRole('button', { name: /equipe pessoal/i });
    fireEvent.click(button);

    const otherTeam = screen.getByText('Laboratório Criativo');
    await act(async () => {
      fireEvent.click(otherTeam);
    });

    expect(mockSetActiveTeamId).toHaveBeenCalledWith('2');
  });
});
