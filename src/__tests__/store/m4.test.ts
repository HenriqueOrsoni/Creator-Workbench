import { useAppStore } from '@/store/useAppStore';
import * as apiModule from '@/lib/api';
import { toast } from 'sonner';

jest.mock('@/lib/api', () => ({
  apiRequest: jest.fn(),
  apiDownload: jest.fn(),
  apiOpenInline: jest.fn(),
  getCookie: jest.fn(),
  setCookie: jest.fn(),
  deleteCookie: jest.fn(),
  registerApiHooks: jest.fn(),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const api = apiModule.apiRequest as jest.Mock;
const T = '/api/v1/teams/7';
const err = (message: string, status: number) => Object.assign(new Error(message), { status });
const team = (id: string, name: string) =>
  ({ id, name, role: 'ADMIN' as const, membersCount: 1, createdAt: 'x' });

describe('Store M4: alertas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetStore();
    useAppStore.setState({ activeTeam: team('7', 'E'), activeTeamId: '7' });
  });

  it('mapeia os alertas do contrato', async () => {
    api.mockResolvedValueOnce([
      { type: 'TASK_OVERDUE', cardId: 5, cardTitle: 'P', taskId: 9, taskTitle: 'T', dueDate: '2026-11-01', daysLeft: -3 },
      { type: 'CARD_DUE_SOON', cardId: 6, cardTitle: 'Q', taskId: null, taskTitle: null, dueDate: '2026-11-15', daysLeft: 2 },
    ]);
    await useAppStore.getState().fetchAlerts();
    expect(api).toHaveBeenCalledWith('GET', `${T}/alerts`);
    expect(useAppStore.getState().alerts).toEqual([
      { type: 'TASK_OVERDUE', cardId: '5', cardTitle: 'P', taskId: '9', taskTitle: 'T', dueDate: '2026-11-01', daysLeft: -3 },
      { type: 'CARD_DUE_SOON', cardId: '6', cardTitle: 'Q', taskId: null, taskTitle: null, dueDate: '2026-11-15', daysLeft: 2 },
    ]);
  });

  it('erro do servidor não apaga os alertas já mostrados nem mostra sucesso', async () => {
    useAppStore.setState({ alerts: [{ type: 'CARD_OVERDUE', cardId: '1', cardTitle: 'A', dueDate: 'x', daysLeft: -1 }] });
    api.mockRejectedValueOnce(err('Falha', 500));
    await useAppStore.getState().fetchAlerts();
    expect(useAppStore.getState().alerts).toHaveLength(1);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('uma edição durante a busca repete a busca uma vez', async () => {
    let release: (v: unknown) => void = () => {};
    api.mockImplementationOnce(() => new Promise((r) => { release = r; }));
    api.mockResolvedValueOnce([{ type: 'CARD_OVERDUE', cardId: 2, cardTitle: 'B', dueDate: 'x', daysLeft: -1 }]);
    const first = useAppStore.getState().fetchAlerts();
    await useAppStore.getState().fetchAlerts();
    release([]);
    await first;
    await new Promise((r) => setTimeout(r, 0));
    expect(api).toHaveBeenCalledTimes(2);
    expect(useAppStore.getState().alerts[0].cardId).toBe('2');
  });

  it('recarregar o quadro (depois de editar card ou tarefa) busca os alertas', async () => {
    api.mockImplementation((_m: string, path: string) =>
      Promise.resolve(path.endsWith('/board') ? { teamId: 7, teamName: 'E', columns: [] } : []));
    await useAppStore.getState().fetchBoard();
    await new Promise((r) => setTimeout(r, 0));
    expect(api).toHaveBeenCalledWith('GET', `${T}/alerts`);
  });

  it('trocar de equipe limpa os alertas da equipe anterior e busca os da nova', async () => {
    useAppStore.setState({
      teams: [team('7', 'E'), team('8', 'F')],
      alerts: [{ type: 'CARD_OVERDUE', cardId: '1', cardTitle: 'A', dueDate: 'x', daysLeft: -1 }],
    });
    api.mockImplementation((_m: string, path: string) =>
      Promise.resolve(path.endsWith('/board') ? { teamId: 8, teamName: 'F', columns: [] } : []));
    await useAppStore.getState().setActiveTeamId('8');
    await new Promise((r) => setTimeout(r, 0));
    expect(useAppStore.getState().alerts).toEqual([]);
    expect(api).toHaveBeenCalledWith('GET', '/api/v1/teams/8/alerts');
  });
});

describe('Store M4: convites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetStore();
    useAppStore.setState({ activeTeam: team('7', 'E'), activeTeamId: '7' });
  });

  const inviteDto = { id: 3, email: 'a@b.com', role: 'REVIEWER', status: 'PENDING', invitedBy: { userId: 1, name: 'Luz' }, createdAt: 'c', expiresAt: 'e' };

  it('lista os convites e trata invitedBy nulo', async () => {
    api.mockResolvedValueOnce([inviteDto, { ...inviteDto, id: 4, invitedBy: null }]);
    await useAppStore.getState().fetchTeamInvites();
    expect(api).toHaveBeenCalledWith('GET', `${T}/invites`);
    const list = useAppStore.getState().teamInvites;
    expect(list[0]).toMatchObject({ id: '3', email: 'a@b.com', role: 'REVIEWER', status: 'PENDING', invitedBy: { userId: '1', name: 'Luz' } });
    expect(list[1].invitedBy).toBeUndefined();
  });

  it('cria o convite, avisa e recarrega a lista', async () => {
    api.mockImplementation((method: string) => Promise.resolve(method === 'POST' ? inviteDto : [inviteDto]));
    const ok = await useAppStore.getState().createTeamInvite('a@b.com', 'REVIEWER');
    expect(ok).toBe(true);
    expect(api).toHaveBeenCalledWith('POST', `${T}/invites`, { email: 'a@b.com', role: 'REVIEWER' });
    expect(toast.success).toHaveBeenCalled();
    expect(useAppStore.getState().teamInvites).toHaveLength(1);
  });

  it.each([
    [409, 'Já existe um convite pendente para este e-mail.'],
    [402, 'Seu plano não permite mais membros.'],
    [403, 'Somente o administrador pode convidar.'],
  ])('criar convite com erro %s mostra a mensagem do servidor e não muda a lista', async (status, message) => {
    api.mockRejectedValueOnce(err(message, status));
    const ok = await useAppStore.getState().createTeamInvite('a@b.com', 'CREATOR');
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(message);
    expect(toast.success).not.toHaveBeenCalled();
    expect(useAppStore.getState().teamInvites).toEqual([]);
  });

  it('cancela o convite: remove da lista só quando o servidor aceita', async () => {
    useAppStore.setState({ teamInvites: [{ id: '3', email: 'a@b.com', role: 'CREATOR', status: 'PENDING', createdAt: 'c', expiresAt: 'e' }] });
    api.mockRejectedValueOnce(err('Convite não encontrado.', 404));
    expect(await useAppStore.getState().cancelTeamInvite('3')).toBe(false);
    expect(useAppStore.getState().teamInvites).toHaveLength(1);
    expect(toast.error).toHaveBeenCalledWith('Convite não encontrado.');

    api.mockResolvedValueOnce(null);
    expect(await useAppStore.getState().cancelTeamInvite('3')).toBe(true);
    expect(api).toHaveBeenLastCalledWith('DELETE', `${T}/invites/3`);
    expect(useAppStore.getState().teamInvites).toEqual([]);
  });
});

describe('Store M4: renomear e excluir equipe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetStore();
    useAppStore.setState({ teams: [team('7', 'E'), team('8', 'F')], activeTeam: team('7', 'E'), activeTeamId: '7' });
  });

  it('renomeia usando o nome devolvido pelo servidor', async () => {
    api.mockResolvedValueOnce({ id: 7, name: 'Nome Novo', role: 'ADMIN', membersCount: 1, createdAt: 'x' });
    expect(await useAppStore.getState().renameTeam('Nome Novo')).toBe(true);
    expect(api).toHaveBeenCalledWith('PATCH', T, { name: 'Nome Novo' });
    expect(useAppStore.getState().activeTeam?.name).toBe('Nome Novo');
    expect(useAppStore.getState().teams.find((t) => t.id === '7')?.name).toBe('Nome Novo');
  });

  it('erro ao renomear mantém o nome e mostra a mensagem', async () => {
    api.mockRejectedValueOnce(err('O nome da equipe é obrigatório.', 400));
    expect(await useAppStore.getState().renameTeam('')).toBe(false);
    expect(useAppStore.getState().activeTeam?.name).toBe('E');
    expect(toast.error).toHaveBeenCalledWith('O nome da equipe é obrigatório.');
  });

  it('exclui a equipe ativa e troca para outra equipe', async () => {
    api.mockImplementation((method: string, path: string) =>
      Promise.resolve(method === 'DELETE' ? null : path.endsWith('/board') ? { teamId: 8, teamName: 'F', columns: [] } : []));
    expect(await useAppStore.getState().deleteTeam('7')).toBe(true);
    expect(api).toHaveBeenCalledWith('DELETE', T);
    const s = useAppStore.getState();
    expect(s.teams.map((t) => t.id)).toEqual(['8']);
    expect(s.activeTeamId).toBe('8');
  });

  it('equipe pessoal: 409 do servidor mostra a mensagem e a equipe continua na lista', async () => {
    const msg = 'A equipe pessoal não pode ser excluída.';
    api.mockRejectedValueOnce(err(msg, 409));
    expect(await useAppStore.getState().deleteTeam('7')).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(msg);
    expect(toast.success).not.toHaveBeenCalled();
    expect(useAppStore.getState().teams).toHaveLength(2);
    expect(useAppStore.getState().activeTeamId).toBe('7');
  });

  it('403 ao excluir mostra a mensagem e não muda o estado', async () => {
    api.mockRejectedValueOnce(err('Apenas administradores.', 403));
    expect(await useAppStore.getState().deleteTeam('7')).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Apenas administradores.');
    expect(useAppStore.getState().teams).toHaveLength(2);
  });

  it('mapeia o campo personal das equipes quando o servidor envia', async () => {
    api.mockImplementation((_m: string, path: string) =>
      Promise.resolve(path === '/api/v1/teams'
        ? [{ id: 7, name: 'Pessoal', role: 'ADMIN', membersCount: 1, createdAt: 'x', personal: true }, { id: 8, name: 'F', role: 'ADMIN', membersCount: 1, createdAt: 'x' }]
        : path.endsWith('/board') ? { teamId: 7, teamName: 'Pessoal', columns: [] } : []));
    await useAppStore.getState().fetchTeams();
    const teams = useAppStore.getState().teams;
    expect(teams[0].personal).toBe(true);
    expect(teams[1].personal).toBeUndefined();
  });
});
