import { useAppStore, ProjectCard } from '@/store/useAppStore';
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
const card = (id: string, extra: Partial<ProjectCard> = {}): ProjectCard => ({
  id, title: 'P', description: '', type: 'PROJECT', sortOrder: 0, progress: 0, tasksTotal: 0, tasksDone: 0, createdAt: 'x', ...extra,
});
const statsBody = {
  videoId: 'abc', videoUrl: 'https://www.youtube.com/watch?v=abc', title: 'Aula', publishedAt: '2026-11-01T10:00:00Z',
  latest: { viewCount: 10, likeCount: null, commentCount: 2, capturedAt: '2026-11-02T10:00:00Z' },
  history: [{ capturedAt: '2026-11-01T10:00:00Z', viewCount: 5, likeCount: 1, commentCount: null }],
};

describe('Store YouTube: desempenho do vídeo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetStore();
    useAppStore.setState({
      activeTeamId: '7',
      board: { teamId: '7', teamName: 'E', columns: [{ id: 'c1', name: 'Col', sortOrder: 0, cards: [card('5')] }] },
    });
  });

  it('mapeia videoUrl do card vindo do quadro', async () => {
    api.mockResolvedValueOnce({
      teamId: 7, teamName: 'E',
      columns: [{ id: 1, name: 'Col', sortOrder: 0, cards: [{ id: 5, title: 'P', type: 'PROJECT', videoUrl: 'https://youtu.be/abc' }, { id: 6, title: 'Q', videoUrl: null }] }],
    });
    await useAppStore.getState().fetchBoard();
    const cards = useAppStore.getState().board!.columns[0].cards;
    expect(cards[0].videoUrl).toBe('https://youtu.be/abc');
    expect(cards[1].videoUrl).toBeUndefined();
  });

  it('setCardVideo salva o link e atualiza o card', async () => {
    api.mockResolvedValueOnce({ id: 5, title: 'P', videoUrl: 'https://youtu.be/abc' });
    const ok = await useAppStore.getState().setCardVideo('5', ' https://youtu.be/abc ');
    expect(ok).toBe(true);
    expect(api).toHaveBeenCalledWith('PUT', `${T}/cards/5/video`, { url: 'https://youtu.be/abc' });
    expect(useAppStore.getState().board!.columns[0].cards[0].videoUrl).toBe('https://youtu.be/abc');
    expect(toast.success).toHaveBeenCalled();
  });

  it('url vazia remove o vínculo e os números guardados', async () => {
    useAppStore.setState({ videoStats: { '5': { cardId: '5', videoId: 'a', videoUrl: 'u', title: 't', publishedAt: null, latest: null, history: [] } } });
    api.mockResolvedValueOnce({ id: 5, title: 'P', videoUrl: null });
    expect(await useAppStore.getState().setCardVideo('5', '')).toBe(true);
    expect(api).toHaveBeenCalledWith('PUT', `${T}/cards/5/video`, { url: '' });
    expect(useAppStore.getState().board!.columns[0].cards[0].videoUrl).toBeUndefined();
    expect(useAppStore.getState().videoStats['5']).toBeUndefined();
  });

  it.each([
    [400, 'Informe um link válido do YouTube.'],
    [403, 'Você não tem permissão.'],
    [401, 'Sessão expirada.'],
  ])('setCardVideo com erro %i mostra a mensagem do servidor e não altera o card', async (status, message) => {
    api.mockRejectedValueOnce(err(message, status));
    expect(await useAppStore.getState().setCardVideo('5', 'x')).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(message);
    expect(toast.success).not.toHaveBeenCalled();
    expect(useAppStore.getState().board!.columns[0].cards[0].videoUrl).toBeUndefined();
  });

  it('fetchVideoStats mapeia os números, com nulos', async () => {
    api.mockResolvedValueOnce(statsBody);
    const r = await useAppStore.getState().fetchVideoStats('5');
    expect(api).toHaveBeenCalledWith('GET', `${T}/cards/5/video-stats`);
    expect(r!.latest).toEqual({ viewCount: 10, likeCount: null, commentCount: 2, capturedAt: '2026-11-02T10:00:00Z' });
    expect(r!.history[0].commentCount).toBeNull();
    expect(useAppStore.getState().videoStats['5'].title).toBe('Aula');
  });

  it('fetchVideoStats 404 é estado vazio: sem toast de erro', async () => {
    api.mockRejectedValueOnce(err('Este projeto não tem vídeo do YouTube vinculado.', 404));
    expect(await useAppStore.getState().fetchVideoStats('5')).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
    expect(useAppStore.getState().videoStats['5']).toBeUndefined();
  });

  it('fetchVideoStats 404 apaga números antigos (link removido por outra pessoa)', async () => {
    useAppStore.setState({ videoStats: { '5': { cardId: '5', videoId: 'a', videoUrl: 'u', title: 'Antigo', publishedAt: null, latest: null, history: [] } } });
    api.mockRejectedValueOnce(err('Este projeto não tem vídeo do YouTube vinculado.', 404));
    await useAppStore.getState().fetchVideoStats('5');
    expect(useAppStore.getState().videoStats['5']).toBeUndefined();
  });

  it('fetchVideoStats com erro 500 mostra o toast', async () => {
    api.mockRejectedValueOnce(err('Falha no servidor', 500));
    expect(await useAppStore.getState().fetchVideoStats('5')).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('Falha no servidor');
  });

  it('refreshVideoStats guarda o novo corpo', async () => {
    api.mockResolvedValueOnce(statsBody);
    const r = await useAppStore.getState().refreshVideoStats('5');
    expect(api).toHaveBeenCalledWith('POST', `${T}/cards/5/video-stats/refresh`);
    expect(r!.latest!.viewCount).toBe(10);
  });

  it.each([
    [404, 'Vídeo não encontrado ou privado no YouTube.'],
    [503, 'Integração com o YouTube não configurada.'],
    [503, 'Não foi possível consultar o YouTube agora. Tente novamente.'],
  ])('refresh com erro %i mostra a mensagem e mantém os números antigos', async (status, message) => {
    const old = { cardId: '5', videoId: 'a', videoUrl: 'u', title: 'Antigo', publishedAt: null, latest: null, history: [] };
    useAppStore.setState({ videoStats: { '5': old } });
    api.mockRejectedValueOnce(err(message, status));
    expect(await useAppStore.getState().refreshVideoStats('5')).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(message);
    expect(useAppStore.getState().videoStats['5']).toBe(old);
  });
});
