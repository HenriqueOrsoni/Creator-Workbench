import { apiRequest, apiDownload, ApiError, NETWORK_ERROR_MESSAGE, clearPersistedTeam } from '@/lib/api';

describe('api.ts: falha de rede, leituras repetidas e equipe guardada', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    window.localStorage.clear();
  });

  it('falha de rede vira mensagem em português (não "Failed to fetch")', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await apiRequest('GET', '/api/v1/teams').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Não foi possível conectar ao servidor. Verifique sua conexão.');
    expect(error.message).toBe(NETWORK_ERROR_MESSAGE);
    expect(error.status).toBe(0);
  });

  it('falha de rede também vale para POST e para download', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('NetworkError when attempting to fetch resource.'));

    await expect(apiRequest('POST', '/api/auth/login', { email: 'a@b.c', password: 'x' })).rejects.toThrow(NETWORK_ERROR_MESSAGE);
    await expect(apiDownload('/api/v1/x', 'x.csv')).rejects.toThrow(NETWORK_ERROR_MESSAGE);
  });

  it('erro HTTP continua mostrando o {message} do servidor', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'O título deve ter pelo menos 3 caracteres.' }),
    });

    await expect(apiRequest('PUT', '/api/v1/kanban/1', { title: 'ab' })).rejects.toThrow('O título deve ter pelo menos 3 caracteres.');
  });

  it('GETs idênticos e simultâneos compartilham uma só requisição', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [{ id: 1 }] });

    const [a, b, c] = await Promise.all([
      apiRequest('GET', '/api/v1/teams'),
      apiRequest('GET', '/api/v1/teams'),
      apiRequest('GET', '/api/v1/teams'),
    ]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(a).toEqual([{ id: 1 }]);
    expect(b).toEqual(a);
    expect(c).toEqual(a);

    // Depois de terminar, uma nova leitura vai de novo ao servidor
    await apiRequest('GET', '/api/v1/teams');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('POSTs iguais não são unidos', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1 }) });

    await Promise.all([apiRequest('POST', '/api/v1/x', { a: 1 }), apiRequest('POST', '/api/v1/x', { a: 1 })]);

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('clearPersistedTeam apaga a equipe ativa guardada e mantém o resto', () => {
    window.localStorage.setItem(
      'creator-workbench-storage',
      JSON.stringify({ state: { activeTeamId: '7', accentHue: 200 }, version: 0 })
    );

    clearPersistedTeam();

    const saved = JSON.parse(window.localStorage.getItem('creator-workbench-storage')!);
    expect(saved.state.activeTeamId).toBeNull();
    expect(saved.state.accentHue).toBe(200);
  });
});
