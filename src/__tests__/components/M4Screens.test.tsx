import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '@/store/useAppStore';
import { Navbar } from '@/components/shared/Navbar';
import { TeamMembersDialog } from '@/components/shared/TeamMembersDialog';
import { UserSettingsDialog } from '@/components/shared/UserSettingsDialog';
import { KanbanBoard } from '@/components/shared/KanbanBoard';
import { ConviteContent } from '@/app/convite/page';
import * as apiModule from '@/lib/api';
import { toast } from 'sonner';

jest.mock('@/lib/api', () => ({
  apiRequest: jest.fn(),
  getCookie: jest.fn(),
  setCookie: jest.fn(),
  deleteCookie: jest.fn(),
  registerApiHooks: jest.fn(),
  clearPersistedTeam: jest.fn(),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
const mockReplace = jest.fn();
let mockToken: string | null = 'tok-1';
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => mockToken }),
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));
jest.mock('@/components/shared/ThemeToggle', () => ({ ThemeToggle: () => null }));
jest.mock('@/components/shared/CreateIdeaDialog', () => ({ CreateIdeaDialog: () => null }));
jest.mock('@/components/shared/TeamSwitcher', () => ({ TeamSwitcher: () => null }));
jest.mock('@/components/shared/CardTaskDialog', () => ({
  CardTaskDialog: ({ card }: { card: { title: string } | null }) => (card ? <div data-testid="card-dialog">{card.title}</div> : null),
}));
jest.mock('@/components/shared/TagManager', () => ({ TagManager: () => null }));

jest.setTimeout(30000);

const api = apiModule.apiRequest as jest.Mock;
const cookie = apiModule.getCookie as jest.Mock;
const err = (message: string, status: number) => Object.assign(new Error(message), { status });
const team = (role: 'ADMIN' | 'CREATOR' | 'REVIEWER', extra = {}) =>
  ({ id: '7', name: 'Equipe Alfa', role, membersCount: 1, createdAt: 'x', ...extra });

const alertsDto = [
  { type: 'CARD_OVERDUE', cardId: 5, cardTitle: 'Projeto Atrasado', taskId: null, taskTitle: null, dueDate: '2026-11-01', daysLeft: -4 },
  { type: 'TASK_DUE_SOON', cardId: 6, cardTitle: 'Projeto B', taskId: 2, taskTitle: 'Gravar', dueDate: '2026-11-15', daysLeft: 2 },
];

describe('M4: sino de alertas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetStore();
    cookie.mockReturnValue('tok');
  });

  it.each(['ADMIN', 'CREATOR', 'REVIEWER'] as const)('papel %s vê o sino com a lista de alertas', async (role) => {
    useAppStore.setState({ activeTeam: team(role), activeTeamId: '7' });
    // Os alertas chegam junto com o quadro (fetchBoard), sem busca própria da barra
    api.mockImplementation((_m: string, path: string) =>
      Promise.resolve(path.endsWith('/board') ? { teamId: 7, teamName: 'Equipe Alfa', columns: [] } : alertsDto));
    render(<Navbar />);
    await useAppStore.getState().fetchBoard();
    await waitFor(() => expect(screen.getByTestId('alerts-badge')).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText(/alertas de prazos/i));
    expect(screen.getByText('Alertas de Prazos (2)')).toBeInTheDocument();
    expect(screen.getByText('Projeto Atrasado')).toBeInTheDocument();
    expect(screen.getByText('Atrasado há 4 dias')).toBeInTheDocument();
    expect(screen.getByText('Vence em 2 dias')).toBeInTheDocument();
    expect(screen.getByText('01/11/2026')).toBeInTheDocument();
  });

  it('clicar no alerta navega para o quadro e pede a abertura do card', async () => {
    useAppStore.setState({
      activeTeam: team('ADMIN'), activeTeamId: '7',
      alerts: alertsDto.map((a) => ({ ...a, cardId: String(a.cardId), taskId: a.taskId === null ? null : String(a.taskId) })) as never,
    });
    const onNavigate = jest.fn();
    render(<Navbar onNavigate={onNavigate} />);
    await waitFor(() => expect(screen.getByTestId('alerts-badge')).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText(/alertas de prazos/i));
    await userEvent.click(screen.getByRole('button', { name: /abrir card projeto atrasado/i }));
    expect(onNavigate).toHaveBeenCalledWith('kanban');
    expect(useAppStore.getState().cardToOpenId).toBe('5');
  });

  it('sem alertas mostra a mensagem de vazio e não mostra o ponto de aviso', async () => {
    useAppStore.setState({ activeTeam: team('CREATOR'), activeTeamId: '7' });
    render(<Navbar />);
    await userEvent.click(screen.getByLabelText(/alertas de prazos/i));
    expect(screen.getByText(/nenhum prazo pendente/i)).toBeInTheDocument();
    expect(screen.queryByTestId('alerts-badge')).not.toBeInTheDocument();
  });
});

describe('M4: quadro abre o card pedido pelo alerta', () => {
  const card = { id: '5', title: 'Projeto Atrasado', description: '', type: 'PROJECT', sortOrder: 0, progress: 0, tasksTotal: 0, tasksDone: 0, tasks: [], createdAt: 'x' };
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetStore();
    api.mockResolvedValue([]);
    useAppStore.setState({
      activeTeam: team('ADMIN'), activeTeamId: '7',
      board: { teamId: '7', teamName: 'Equipe Alfa', columns: [{ id: '1', name: 'A fazer', sortOrder: 0, cards: [card] }] },
      items: [],
    } as never);
  });

  it('abre o diálogo do card encontrado', async () => {
    render(<KanbanBoard />);
    useAppStore.getState().setCardToOpenId('5');
    await waitFor(() => expect(screen.getByTestId('card-dialog')).toHaveTextContent('Projeto Atrasado'));
    expect(useAppStore.getState().cardToOpenId).toBeNull();
  });

  it('card que não está no quadro mostra aviso e não abre nada', async () => {
    render(<KanbanBoard />);
    useAppStore.getState().setCardToOpenId('999');
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Não encontramos este card no quadro.'));
    expect(screen.queryByTestId('card-dialog')).not.toBeInTheDocument();
  });
});

describe('M4: gestão da equipe e convites (papéis)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetStore();
    api.mockResolvedValue([]);
  });

  it('ADMIN vê Convites, o formulário de convite e Configurações', async () => {
    useAppStore.setState({ activeTeam: team('ADMIN'), activeTeamId: '7' });
    render(<TeamMembersDialog open onOpenChange={jest.fn()} />);
    expect(screen.getByRole('tab', { name: /configurações/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /convites/i }));
    expect(screen.getByPlaceholderText(/e-mail do convidado/i)).toBeInTheDocument();
  });

  it.each(['CREATOR', 'REVIEWER'] as const)('%s não vê Configurações nem Convites e a lista de convites não é buscada', async (role) => {
    const dto = { id: 3, email: 'a@b.com', role: 'CREATOR', status: 'PENDING', createdAt: 'c', expiresAt: '2026-11-20T00:00:00Z' };
    useAppStore.setState({ activeTeam: team(role), activeTeamId: '7' });
    api.mockResolvedValue([dto]);
    render(<TeamMembersDialog open onOpenChange={jest.fn()} />);
    expect(screen.queryByRole('tab', { name: /configurações/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /convites/i })).not.toBeInTheDocument();
    expect(screen.queryByText('a@b.com')).not.toBeInTheDocument();
    expect(api.mock.calls.some((c) => String(c[1]).includes('/invites'))).toBe(false);
  });

  it('o convite é enviado com e-mail e papel e o 402 do plano aparece como erro', async () => {
    useAppStore.setState({ activeTeam: team('ADMIN'), activeTeamId: '7' });
    render(<TeamMembersDialog open onOpenChange={jest.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: /convites/i }));
    fireEvent.change(screen.getByPlaceholderText(/e-mail do convidado/i), { target: { value: 'novo@x.com' } });
    api.mockRejectedValueOnce(err('Limite de membros do plano atingido.', 402));
    await userEvent.click(screen.getByRole('button', { name: /enviar convite por e-mail/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Limite de membros do plano atingido.', expect.objectContaining({ action: expect.objectContaining({ label: 'Ver planos' }) })));
    expect(api).toHaveBeenCalledWith('POST', '/api/v1/teams/7/invites', { email: 'novo@x.com', role: 'CREATOR' });
    expect(screen.getByPlaceholderText(/e-mail do convidado/i)).toHaveValue('novo@x.com');
  });

  async function openDeleteModal() {
    await userEvent.click(screen.getByRole('tab', { name: /configurações/i }));
    await userEvent.click(screen.getByRole('button', { name: /^excluir equipe$/i }));
  }

  it('excluir equipe só habilita depois de digitar o nome exato e então chama DELETE', async () => {
    useAppStore.setState({ activeTeam: team('ADMIN'), activeTeamId: '7', teams: [team('ADMIN'), { ...team('ADMIN'), id: '8', name: 'Outra' }] });
    api.mockImplementation((method: string, path: string) =>
      Promise.resolve(method === 'DELETE' ? null : path.endsWith('/board') ? { teamId: 8, teamName: 'Outra', columns: [] } : []));
    const onOpenChange = jest.fn();
    render(<TeamMembersDialog open onOpenChange={onOpenChange} />);
    await openDeleteModal();
    const confirm = screen.getByRole('button', { name: /confirmar exclusão/i });
    expect(confirm).toBeDisabled();
    const input = screen.getByPlaceholderText(/digite o nome da equipe/i);
    fireEvent.change(input, { target: { value: 'equipe alfa' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: 'Equipe Alfa' } });
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    await waitFor(() => expect(api).toHaveBeenCalledWith('DELETE', '/api/v1/teams/7'));
    await waitFor(() => expect(useAppStore.getState().activeTeamId).toBe('8'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('equipe pessoal: botão de excluir desabilitado quando o servidor marca personal', async () => {
    useAppStore.setState({ activeTeam: team('ADMIN', { personal: true }), activeTeamId: '7' });
    render(<TeamMembersDialog open onOpenChange={jest.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: /configurações/i }));
    expect(screen.getByRole('button', { name: /^excluir equipe$/i })).toBeDisabled();
    expect(screen.getByText('A equipe pessoal não pode ser excluída.')).toBeInTheDocument();
  });

  it('sem o campo personal: o 409 do servidor aparece e o diálogo continua aberto', async () => {
    useAppStore.setState({ activeTeam: team('ADMIN'), activeTeamId: '7', teams: [team('ADMIN')] });
    api.mockImplementation((method: string) =>
      method === 'DELETE' ? Promise.reject(err('A equipe pessoal não pode ser excluída.', 409)) : Promise.resolve([]));
    const onOpenChange = jest.fn();
    render(<TeamMembersDialog open onOpenChange={onOpenChange} />);
    await openDeleteModal();
    fireEvent.change(screen.getByPlaceholderText(/digite o nome da equipe/i), { target: { value: 'Equipe Alfa' } });
    await userEvent.click(screen.getByRole('button', { name: /confirmar exclusão/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('A equipe pessoal não pode ser excluída.'));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(useAppStore.getState().teams).toHaveLength(1);
  });

  it('renomear envia o novo nome', async () => {
    useAppStore.setState({ activeTeam: team('ADMIN'), activeTeamId: '7', teams: [team('ADMIN')] });
    render(<TeamMembersDialog open onOpenChange={jest.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: /configurações/i }));
    api.mockResolvedValue({ id: 7, name: 'Beta' });
    fireEvent.change(screen.getByPlaceholderText('Nome da Equipe'), { target: { value: 'Beta' } });
    await userEvent.click(screen.getByRole('button', { name: /salvar nome/i }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('PATCH', '/api/v1/teams/7', { name: 'Beta' }));
    expect(useAppStore.getState().activeTeam?.name).toBe('Beta');
  });
});

describe('M4: segurança da conta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cookie.mockReturnValue('123');
    api.mockImplementation((method: string, path: string) =>
      Promise.resolve(method === 'GET' && path === '/api/v1/users/123' ? { id: 123, name: 'Ana', email: 'ana@x.com' } : {}));
  });

  async function openTab(name: RegExp) {
    render(<UserSettingsDialog open onOpenChange={jest.fn()} />);
    await waitFor(() => expect(screen.getByDisplayValue('Ana')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('tab', { name }));
  }

  it('troca a senha com PUT e limpa os campos no sucesso (204)', async () => {
    await openTab(/segurança/i);
    const cur = screen.getByPlaceholderText(/senha atual/i);
    fireEvent.change(cur, { target: { value: 'antiga1' } });
    fireEvent.change(screen.getByPlaceholderText(/nova senha/i), { target: { value: 'nova123' } });
    api.mockResolvedValueOnce(null);
    await userEvent.click(screen.getByRole('button', { name: /alterar senha/i }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('PUT', '/api/v1/users/123/password', { currentPassword: 'antiga1', newPassword: 'nova123' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(cur).toHaveValue('');
  });

  it('senha atual errada: mostra a mensagem do servidor, sem sucesso e mantém os campos', async () => {
    await openTab(/segurança/i);
    fireEvent.change(screen.getByPlaceholderText(/senha atual/i), { target: { value: 'errada' } });
    fireEvent.change(screen.getByPlaceholderText(/nova senha/i), { target: { value: 'nova123' } });
    api.mockRejectedValueOnce(err('Senha atual incorreta.', 400));
    await userEvent.click(screen.getByRole('button', { name: /alterar senha/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Senha atual incorreta.'));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText(/nova senha/i)).toHaveValue('nova123');
  });

  it('nova senha com menos de 6 caracteres mantém o botão desabilitado e não chama a API', async () => {
    await openTab(/segurança/i);
    fireEvent.change(screen.getByPlaceholderText(/senha atual/i), { target: { value: 'antiga1' } });
    fireEvent.change(screen.getByPlaceholderText(/nova senha/i), { target: { value: '12345' } });
    expect(screen.getByRole('button', { name: /alterar senha/i })).toBeDisabled();
    expect(api.mock.calls.some((c) => c[0] === 'PUT')).toBe(false);
  });

  it('e-mail: pede o código, confirma e atualiza o e-mail mostrado', async () => {
    await openTab(/e-mail/i);
    fireEvent.change(screen.getByPlaceholderText('novo@exemplo.com'), { target: { value: 'novo@x.com' } });
    api.mockResolvedValueOnce({ message: 'Código enviado.' });
    await userEvent.click(screen.getByRole('button', { name: /enviar código de verificação/i }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('POST', '/api/v1/users/123/email-change', { newEmail: 'novo@x.com' }));
    fireEvent.change(await screen.findByPlaceholderText('123456'), { target: { value: '654321' } });
    api.mockResolvedValueOnce({ id: 123, name: 'Ana', email: 'novo@x.com' });
    await userEvent.click(screen.getByRole('button', { name: /confirmar troca/i }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('POST', '/api/v1/users/123/email-change/confirm', { token: '654321' }));
    await userEvent.click(screen.getByRole('tab', { name: /perfil/i }));
    expect(screen.getByDisplayValue('novo@x.com')).toBeInTheDocument();
  });

  it('e-mail já usado (409): mostra a mensagem e não passa para a etapa do código', async () => {
    await openTab(/e-mail/i);
    fireEvent.change(screen.getByPlaceholderText('novo@exemplo.com'), { target: { value: 'usado@x.com' } });
    api.mockRejectedValueOnce(err('Este e-mail já está em uso.', 409));
    await userEvent.click(screen.getByRole('button', { name: /enviar código de verificação/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Este e-mail já está em uso.'));
    expect(screen.queryByPlaceholderText('123456')).not.toBeInTheDocument();
  });

  it('código errado: mostra a mensagem e continua na etapa do código', async () => {
    await openTab(/e-mail/i);
    fireEvent.change(screen.getByPlaceholderText('novo@exemplo.com'), { target: { value: 'novo@x.com' } });
    api.mockResolvedValueOnce({ message: 'ok' });
    await userEvent.click(screen.getByRole('button', { name: /enviar código de verificação/i }));
    fireEvent.change(await screen.findByPlaceholderText('123456'), { target: { value: '000000' } });
    api.mockRejectedValueOnce(err('Código inválido ou expirado.', 400));
    await userEvent.click(screen.getByRole('button', { name: /confirmar troca/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Código inválido ou expirado.'));
    expect(screen.getByPlaceholderText('123456')).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalledWith('E-mail atualizado com sucesso!');
  });
});

describe('M4: página /convite', () => {
  const invite = { teamName: 'Equipe Beta', role: 'REVIEWER', email: 'ana@x.com', invitedByName: 'Luz', expiresAt: '2026-11-20T00:00:00Z' };
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetStore();
    mockToken = 'tok-1';
    window.sessionStorage.clear();
    cookie.mockReturnValue(undefined);
  });

  it('sem token mostra convite inválido e não chama a API', async () => {
    mockToken = null;
    render(<ConviteContent />);
    expect(await screen.findByText(/token de convite não informado/i)).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it('token inválido ou expirado mostra a mensagem do servidor', async () => {
    api.mockRejectedValueOnce(err('Convite expirado.', 404));
    render(<ConviteContent />);
    expect(await screen.findByText('Convite expirado.')).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('GET', '/api/auth/invites/tok-1');
  });

  it('sem login oferece entrar ou criar conta voltando para o convite', async () => {
    api.mockResolvedValueOnce(invite);
    render(<ConviteContent />);
    expect(await screen.findByText('Equipe Beta')).toBeInTheDocument();
    expect(screen.getByText('Revisor')).toBeInTheDocument();
    const back = encodeURIComponent('/convite');
    expect(screen.getByRole('link', { name: /entrar na minha conta/i })).toHaveAttribute('href', `/login?redirect=${back}`);
    expect(screen.getByRole('link', { name: /criar uma nova conta/i })).toHaveAttribute('href', `/registrar?redirect=${back}`);
    expect(screen.queryByRole('button', { name: /aceitar/i })).not.toBeInTheDocument();
  });

  it('logado aceita: busca equipes, troca para a equipe nova e vai ao início', async () => {
    cookie.mockReturnValue('tok');
    const team9 = { id: 9, name: 'Equipe Beta', role: 'REVIEWER', membersCount: 2, createdAt: 'x' };
    api.mockImplementation((_m: string, path: string) => {
      if (path === '/api/auth/invites/tok-1') return Promise.resolve(invite);
      if (path === '/api/v1/invites/tok-1/accept') return Promise.resolve(team9);
      if (path === '/api/v1/teams') return Promise.resolve([team9]);
      return Promise.resolve(path.endsWith('/board') ? { teamId: 9, teamName: 'Equipe Beta', columns: [] } : []);
    });
    render(<ConviteContent />);
    await userEvent.click(await screen.findByRole('button', { name: /aceitar convite/i }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(api).toHaveBeenCalledWith('POST', '/api/v1/invites/tok-1/accept');
    expect(useAppStore.getState().activeTeamId).toBe('9');
  });

  it('403 (e-mail diferente) mostra a mensagem, não troca de equipe e não navega', async () => {
    cookie.mockReturnValue('tok');
    api.mockImplementation((_m: string, path: string) =>
      path.endsWith('/accept') ? Promise.reject(err('Este convite é para outro e-mail.', 403)) : Promise.resolve(invite));
    render(<ConviteContent />);
    await userEvent.click(await screen.findByRole('button', { name: /aceitar convite/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Este convite é para outro e-mail.');
    expect(toast.error).toHaveBeenCalledWith('Este convite é para outro e-mail.');
    expect(mockReplace).not.toHaveBeenCalled();
    expect(useAppStore.getState().activeTeamId).toBeNull();
    expect(screen.getByRole('button', { name: /aceitar convite/i })).toBeEnabled();
  });

  it('token com ../ continua sendo um único segmento da rota e do link de volta', async () => {
    mockToken = '../../x?a=1';
    api.mockResolvedValueOnce(invite);
    render(<ConviteContent />);
    await screen.findByText('Equipe Beta');
    expect(api).toHaveBeenCalledWith('GET', '/api/auth/invites/..%2F..%2Fx%3Fa%3D1');
    const inner = encodeURIComponent('/convite');
    expect(screen.getByRole('link', { name: /entrar na minha conta/i })).toHaveAttribute('href', `/login?redirect=${inner}`);
  });

  it('guarda o token na sessão e tira da barra de endereço; recarregar sem o token ainda funciona', async () => {
    const spy = jest.spyOn(window.history, 'replaceState');
    api.mockResolvedValue(invite);
    const first = render(<ConviteContent />);
    await screen.findByText('Equipe Beta');
    expect(window.sessionStorage.getItem('creator_invite_token')).toBe('tok-1');
    expect(spy).toHaveBeenCalledWith(null, '', '/convite');
    first.unmount();
    mockToken = null;
    api.mockClear();
    render(<ConviteContent />);
    await screen.findByText('Equipe Beta');
    expect(api).toHaveBeenCalledWith('GET', '/api/auth/invites/tok-1');
    spy.mockRestore();
  });

  it('convite inválido leva ao login com o texto certo e apaga o token guardado', async () => {
    api.mockRejectedValueOnce(err('Convite expirado.', 404));
    render(<ConviteContent />);
    await waitFor(() => expect(window.sessionStorage.getItem('creator_invite_token')).toBeNull());
    expect(await screen.findByRole('link', { name: /ir para o login/i })).toHaveAttribute('href', '/login');
  });
});
