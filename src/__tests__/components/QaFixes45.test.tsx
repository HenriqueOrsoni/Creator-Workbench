import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '@/store/useAppStore';
import { Navbar } from '@/components/shared/Navbar';
import { ConviteContent } from '@/app/convite/page';
import * as apiModule from '@/lib/api';

jest.mock('@/lib/api', () => ({
  apiRequest: jest.fn(),
  getCookie: jest.fn(),
  setCookie: jest.fn(),
  deleteCookie: jest.fn(),
  registerApiHooks: jest.fn(),
  clearPersistedTeam: jest.fn(),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => 'tok-1' }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/components/shared/ThemeToggle', () => ({ ThemeToggle: () => null }));
jest.mock('@/components/shared/CreateIdeaDialog', () => ({ CreateIdeaDialog: () => null }));
jest.mock('@/components/shared/TeamSwitcher', () => ({ TeamSwitcher: () => null }));

jest.setTimeout(30000);

const api = apiModule.apiRequest as jest.Mock;
const cookie = apiModule.getCookie as jest.Mock;
const err = (message: string, status: number) => Object.assign(new Error(message), { status });
const team = { id: '7', name: 'Equipe Alfa', role: 'ADMIN' as const, membersCount: 1, createdAt: 'x' };

describe('QA M4/M5: sino de alertas com falha', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetStore();
    cookie.mockReturnValue('tok');
    useAppStore.setState({ activeTeam: team, activeTeamId: '7' });
  });

  it('GET /alerts falhou: o painel não diz "Nenhum prazo" e oferece tentar de novo', async () => {
    api.mockRejectedValueOnce(err('Erro interno', 500));
    await useAppStore.getState().fetchAlerts();
    expect(useAppStore.getState().alertsError).toBe(true);
    render(<Navbar />);
    await userEvent.click(screen.getByLabelText(/alertas de prazos/i));
    expect(screen.getByText('Não foi possível carregar os alertas.')).toBeInTheDocument();
    expect(screen.queryByText(/nenhum prazo pendente/i)).not.toBeInTheDocument();

    api.mockResolvedValueOnce([]);
    await userEvent.click(screen.getByRole('button', { name: /tentar de novo/i }));
    await waitFor(() => expect(screen.getByText(/nenhum prazo pendente/i)).toBeInTheDocument());
    expect(useAppStore.getState().alertsError).toBe(false);
  });

  it('Configurações no menu lateral fecha o menu e abre o diálogo da conta', async () => {
    api.mockResolvedValue({ id: 5, name: 'Ana', email: 'ana@x.com' });
    cookie.mockReturnValue('5');
    render(<Navbar />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    await userEvent.click(screen.getByRole('button', { name: /^configurações$/i }));
    expect(await screen.findByRole('tab', { name: /segurança/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /encerrar sessão/i, hidden: false })).not.toBeInTheDocument();
  });

  it('o botão do menu lateral tem nome acessível', () => {
    render(<Navbar />);
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toBeInTheDocument();
  });
});

describe('QA M4: /convite com outra conta conectada', () => {
  const invite = { teamName: 'Equipe Beta', role: 'REVIEWER', email: 'convidada@x.com', invitedByName: 'Luz', expiresAt: '2026-11-20T00:00:00Z' };
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetStore();
    window.sessionStorage.clear();
    cookie.mockImplementation((name: string) => (name === 'creator_user_id' ? '5' : 'tok'));
  });

  it('mostra a conta conectada e, se for outra, oferece sair e bloqueia o aceite', async () => {
    api.mockImplementation((_m: string, path: string) =>
      Promise.resolve(path.startsWith('/api/v1/users/') ? { id: 5, email: 'outra@x.com' } : invite));
    render(<ConviteContent />);
    expect(await screen.findByText('outra@x.com')).toBeInTheDocument();
    expect(screen.getByText(/não é a conta conectada/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aceitar convite/i })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: /sair e entrar com outra conta/i }));
    expect(apiModule.deleteCookie).toHaveBeenCalledWith('creator_auth_token');
    expect(apiModule.deleteCookie).toHaveBeenCalledWith('creator_user_id');
  });

  it('mesma conta: mostra o e-mail e deixa aceitar', async () => {
    api.mockImplementation((_m: string, path: string) =>
      Promise.resolve(path.startsWith('/api/v1/users/') ? { id: 5, email: 'Convidada@x.com' } : invite));
    render(<ConviteContent />);
    expect(await screen.findByText('Convidada@x.com')).toBeInTheDocument();
    expect(screen.queryByText(/sair e entrar com outra conta/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aceitar convite/i })).toBeEnabled();
  });
});
