import { useAppStore } from '@/store/useAppStore';
import * as apiModule from '@/lib/api';
import { toast } from 'sonner';

jest.mock('@/lib/api', () => ({
  apiRequest: jest.fn(),
  apiDownload: jest.fn(),
  getCookie: jest.fn(),
  setCookie: jest.fn(),
  deleteCookie: jest.fn(),
}));

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const api = apiModule.apiRequest as jest.Mock;
const T = '/api/v1/teams/7';

function mockRoutes(routes: Record<string, unknown>) {
  api.mockImplementation((method: string, path: string) => {
    const key = `${method} ${path.split('?')[0]}`;
    if (!(key in routes)) return Promise.reject(new Error(`Rota inesperada: ${key}`));
    const value = routes[key];
    return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
  });
}

describe('Store: fechamento do marco 1 (etiqueta, edição de ideia, conversão com título)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetStore();
    useAppStore.setState({ activeTeamId: '7' });
  });

  describe('updateProject com etiqueta', () => {
    const board = { teamId: 7, teamName: 'E', columns: [] };

    it('sem tagId não envia o campo (mantém a etiqueta)', async () => {
      mockRoutes({ 'PUT /api/v1/kanban/100': { id: 100 }, [`GET ${T}/board`]: board });
      await useAppStore.getState().updateProject('100', 'Título', 'Público', 'Objetivo longo o bastante', '');
      const put = api.mock.calls.find((c) => c[0] === 'PUT');
      expect(put![2]).not.toHaveProperty('tagId');
    });

    it('troca a etiqueta enviando o id como número', async () => {
      mockRoutes({ 'PUT /api/v1/kanban/100': { id: 100 }, [`GET ${T}/board`]: board });
      await useAppStore.getState().updateProject('100', 'Título', 'Público', 'Objetivo longo o bastante', '', '3');
      const put = api.mock.calls.find((c) => c[0] === 'PUT');
      expect(put![2]).toMatchObject({ tagId: 3 });
    });

    it('remove a etiqueta enviando 0 e recarrega o quadro', async () => {
      mockRoutes({ 'PUT /api/v1/kanban/100': { id: 100 }, [`GET ${T}/board`]: board });
      const ok = await useAppStore.getState().updateProject('100', 'Título', 'Público', 'Objetivo longo o bastante', '', '');
      expect(ok).toBe(true);
      const put = api.mock.calls.find((c) => c[0] === 'PUT');
      expect(put![2]).toMatchObject({ tagId: 0 });
      expect(api).toHaveBeenCalledWith('GET', `${T}/board`);
    });

    it('erro do servidor (ex.: etiqueta de outra equipe) mostra a mensagem e não recarrega', async () => {
      mockRoutes({ 'PUT /api/v1/kanban/100': new Error('Etiqueta não pertence à equipe.') });
      const ok = await useAppStore.getState().updateProject('100', 'T', 'P', 'Objetivo longo o bastante', '', '9');
      expect(ok).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Etiqueta não pertence à equipe.');
      expect(toast.success).not.toHaveBeenCalled();
      expect(api).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateIdea', () => {
    it('envia título e descrição, sem tagId quando não mudou, e recarrega as ideias', async () => {
      mockRoutes({ 'PUT /api/v1/kanban/50': { id: 50, tagId: 1 }, [`GET ${T}/ideas`]: [{ id: 50, title: 'Novo', tagId: 1, tag: 'Tutorial', tagColor: '#2E7D32' }] });

      const ok = await useAppStore.getState().updateIdea('50', { title: 'Novo', description: 'desc' });

      expect(ok).toBe(true);
      const put = api.mock.calls.find((c) => c[0] === 'PUT');
      expect(put![2]).toEqual({ title: 'Novo', description: 'desc' });
      expect(useAppStore.getState().ideas[0]).toMatchObject({ id: '50', title: 'Novo', tag: 'Tutorial' });
      expect(toast.success).toHaveBeenCalledWith('Ideia atualizada!');
    });

    it('troca e remove a etiqueta (id numérico e 0)', async () => {
      mockRoutes({ 'PUT /api/v1/kanban/50': { id: 50 }, [`GET ${T}/ideas`]: [] });

      await useAppStore.getState().updateIdea('50', { title: 'Abc', description: '', tagId: '2' });
      await useAppStore.getState().updateIdea('50', { title: 'Abc', description: '', tagId: '' });

      const puts = api.mock.calls.filter((c) => c[0] === 'PUT');
      expect(puts[0][2]).toMatchObject({ tagId: 2 });
      expect(puts[1][2]).toMatchObject({ tagId: 0 });
    });

    it('erro 400 (título curto) mostra a mensagem do servidor, devolve false e não recarrega', async () => {
      mockRoutes({ 'PUT /api/v1/kanban/50': new Error('O título deve ter pelo menos 3 caracteres.') });

      const ok = await useAppStore.getState().updateIdea('50', { title: 'ab', description: '' });

      expect(ok).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('O título deve ter pelo menos 3 caracteres.');
      expect(toast.success).not.toHaveBeenCalled();
      expect(api).toHaveBeenCalledTimes(1);
    });

    it('erro 403 (Revisor) mostra a mensagem e não muda as ideias', async () => {
      useAppStore.setState({ ideas: [{ id: '50', title: 'Antigo', description: '', type: 'IDEA', sortOrder: 0, progress: 0, tasksTotal: 0, tasksDone: 0, createdAt: '' }] });
      mockRoutes({ 'PUT /api/v1/kanban/50': new Error('Seu papel na equipe não permite esta ação.') });

      const ok = await useAppStore.getState().updateIdea('50', { title: 'Novo título', description: '' });

      expect(ok).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Seu papel na equipe não permite esta ação.');
      expect(useAppStore.getState().ideas[0].title).toBe('Antigo');
    });
  });

  describe('convertInboxIdea', () => {
    it('envia o título junto com público-alvo e objetivo', async () => {
      mockRoutes({
        [`POST ${T}/cards/50/convert`]: { id: 50 },
        [`GET ${T}/ideas`]: [],
        [`GET ${T}/board`]: { teamId: 7, teamName: 'E', columns: [] },
      });

      const ok = await useAppStore.getState().convertInboxIdea('50', '10', { title: 'Projeto novo', targetAudience: 'Iniciantes', pedagogicalObjective: 'Entender BFS' });

      expect(ok).toBe(true);
      const post = api.mock.calls.find((c) => c[0] === 'POST');
      expect(post![1]).toBe(`${T}/cards/50/convert?targetColumnId=10`);
      expect(post![2]).toEqual({ title: 'Projeto novo', targetAudience: 'Iniciantes', pedagogicalObjective: 'Entender BFS' });
    });

    it('erro 400 devolve false com a mensagem do servidor', async () => {
      mockRoutes({ [`POST ${T}/cards/50/convert`]: new Error('O título deve ter pelo menos 3 caracteres.') });

      const ok = await useAppStore.getState().convertInboxIdea('50', '10', { title: 'ab' });

      expect(ok).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('O título deve ter pelo menos 3 caracteres.');
    });
  });

  describe('fetchTeams: carga sem pedidos repetidos', () => {
    it('duas chamadas simultâneas fazem um único GET /teams', async () => {
      mockRoutes({
        'GET /api/v1/teams': [{ id: 7, name: 'Equipe', role: 'ADMIN', membersCount: 1, createdAt: 'x' }],
        [`GET ${T}/board`]: { teamId: 7, teamName: 'Equipe', columns: [] },
        [`GET ${T}/ideas`]: [],
        [`GET ${T}/courses`]: [],
        [`GET ${T}/tags`]: [],
        [`GET ${T}/members`]: [],
      });

      await Promise.all([useAppStore.getState().fetchTeams(), useAppStore.getState().fetchTeams()]);

      const teamsCalls = api.mock.calls.filter((c) => c[1] === '/api/v1/teams');
      expect(teamsCalls).toHaveLength(1);
      expect(useAppStore.getState().activeTeamId).toBe('7');
    });
  });

  describe('logout', () => {
    it('resetStore limpa a equipe ativa antes de qualquer nova busca', () => {
      useAppStore.setState({ activeTeamId: '7', activeTeam: { id: '7', name: 'E', role: 'ADMIN', membersCount: 1, createdAt: 'x' } });

      useAppStore.getState().resetStore();

      expect(useAppStore.getState().activeTeamId).toBeNull();
      expect(useAppStore.getState().activeTeam).toBeNull();
      expect(api).not.toHaveBeenCalled();
    });
  });
});
