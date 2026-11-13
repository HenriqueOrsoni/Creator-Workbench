import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamSwitcher } from '@/components/shared/TeamSwitcher';
import { useAppStore } from '@/store/useAppStore';
import { requestPlanPage } from '@/lib/plan-nav';

jest.setTimeout(30000);

describe('QA M5 (BF-M5-01): "Ver planos" fecha o diálogo de criar equipe', () => {
  it('requestPlanPage fecha o diálogo aberto', async () => {
    const t = { id: '1', name: 'Equipe Pessoal', role: 'ADMIN' as const, membersCount: 1, createdAt: 'x' };
    useAppStore.setState({ teams: [t], activeTeam: t, activeTeamId: '1', fetchTeams: jest.fn() });
    render(<TeamSwitcher />);
    await userEvent.click(screen.getByText('Equipe Pessoal'));
    await userEvent.click(await screen.findByRole('button', { name: /criar equipe/i }));
    const input = await screen.findByPlaceholderText(/Laboratório de Mídias/i);
    expect(input).toBeInTheDocument();
    act(() => requestPlanPage());
    await waitFor(() => expect(screen.queryByPlaceholderText(/Laboratório de Mídias/i)).not.toBeInTheDocument());
  });
});
