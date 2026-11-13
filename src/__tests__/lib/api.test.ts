import { setCookie, getCookie, deleteCookie, apiRequest, apiDownload, fileNameFromDisposition } from '@/lib/api';

describe('5.2 Integração Frontend ↔ Backend (IT-11 a IT-14)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    document.cookie = '';
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // IT-11: Login no frontend armazena cookie JWT
  it('IT-11: setCookie armazena o token JWT e getCookie recupera corretamente', () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-payload';
    setCookie('creator_auth_token', fakeToken, 86400);

    const token = getCookie('creator_auth_token');
    expect(token).toBe(fakeToken);

    deleteCookie('creator_auth_token');
    expect(getCookie('creator_auth_token')).toBeNull();
  });

  // IT-12: Requisições autenticadas enviam Bearer token no cabeçalho Authorization
  it('IT-12: apiRequest anexa o header Authorization quando o token está nos cookies', async () => {
    const fakeToken = 'valid-jwt-token-xyz';
    setCookie('creator_auth_token', fakeToken, 86400);

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [{ id: 1, title: 'Item de teste' }],
    });

    const result = await apiRequest('GET', '/api/v1/kanban');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/kanban',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fakeToken}`,
        }),
      })
    );
    expect(result).toEqual([{ id: 1, title: 'Item de teste' }]);
  });

  // IT-13: Token expirado (401) limpa cookies e dispara tratamento de sessão
  it('IT-13: apiRequest com resposta 401 Unauthorized limpa cookies e dispara invalidation', async () => {
    setCookie('creator_auth_token', 'expired-token', 86400);
    setCookie('creator_user_id', '1', 86400);

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Token expirado' }),
    });

    await expect(apiRequest('GET', '/api/v1/kanban')).rejects.toThrow(
      'Sessão expirada. Redirecionando...'
    );

    expect(getCookie('creator_auth_token')).toBeNull();
    expect(getCookie('creator_user_id')).toBeNull();
  });

  // BF-11: 401 em rotas de equipe limpa cookies e invalida sessão
  it('BF-11: apiRequest com 401 em rotas de equipe limpa cookies e dispara redirecionamento', async () => {
    setCookie('creator_auth_token', 'expired-team-token', 86400);
    setCookie('creator_user_id', '1', 86400);

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Token expirado' }),
    });

    await expect(apiRequest('GET', '/api/v1/teams/1/board')).rejects.toThrow(
      'Sessão expirada. Redirecionando...'
    );

    expect(getCookie('creator_auth_token')).toBeNull();
    expect(getCookie('creator_user_id')).toBeNull();
  });

  // IT-13.1 (FE-28): Resposta 403 Forbidden não deve deslogar o usuário nem limpar cookies
  it('IT-13.1: apiRequest com resposta 403 Forbidden não limpa cookies e lança erro de acesso negado', async () => {
    setCookie('creator_auth_token', 'valid-reviewer-token', 86400);
    setCookie('creator_user_id', '2', 86400);

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Acesso negado para o papel Revisor.' }),
    });

    await expect(apiRequest('POST', '/api/v1/kanban/1/delete')).rejects.toThrow(
      'Acesso negado para o papel Revisor.'
    );

    // Garante que o usuário NÃO foi deslogado
    expect(getCookie('creator_auth_token')).toBe('valid-reviewer-token');
    expect(getCookie('creator_user_id')).toBe('2');
  });

  // IT-14: API offline ou erro HTTP genérico lança mensagem de erro tratada
  it('IT-14: apiRequest lança erro amigável quando o backend retorna status de erro', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Dados inválidos ou incompletos.' }),
    });

    await expect(apiRequest('POST', '/api/v1/kanban', {})).rejects.toThrow(
      'Dados inválidos ou incompletos.'
    );
  });

  // BF-12: Mitigação de armazenamento de token em storage
  it('BF-12: handleUnauthorized limpa cookies e qualquer token residual de storage', async () => {
    setCookie('creator_auth_token', 'token-to-delete', 86400);
    window.localStorage.setItem('creator_auth_token', 'legacy-token');

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    });

    await expect(apiRequest('GET', '/api/v1/kanban')).rejects.toThrow();

    expect(getCookie('creator_auth_token')).toBeNull();
    expect(window.localStorage.getItem('creator_auth_token')).toBeNull();
  });

  it('erros trazem a mensagem do servidor e o status HTTP', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ message: 'Já existe uma etiqueta com esse nome.' }),
    });

    await expect(apiRequest('POST', '/api/v1/teams/1/tags', { name: 'x' })).rejects.toMatchObject({
      message: 'Já existe uma etiqueta com esse nome.',
      status: 409,
    });
  });

  it('403 mostra a mensagem e não derruba a sessão', async () => {
    setCookie('creator_auth_token', 'abc', 86400);
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Seu papel na equipe não permite esta ação.' }),
    });

    await expect(apiRequest('PATCH', '/api/v1/teams/1/cards/2/move', {})).rejects.toMatchObject({
      message: 'Seu papel na equipe não permite esta ação.',
      status: 403,
    });
    expect(getCookie('creator_auth_token')).toBe('abc');
  });

  it('401 em rota protegida limpa token e creator_user_id', async () => {
    setCookie('creator_auth_token', 'abc', 86400);
    setCookie('creator_user_id', '9', 86400);
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ message: 'x' }) });

    await expect(apiRequest('GET', '/api/v1/teams')).rejects.toMatchObject({ status: 401 });
    expect(getCookie('creator_auth_token')).toBeNull();
    expect(getCookie('creator_user_id')).toBeNull();
  });

  it('402 mostra a mensagem do plano', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 402,
      json: async () => ({ message: 'Seu plano não permite esta ação.' }),
    });

    await expect(apiRequest('POST', '/api/v1/teams/1/courses', {})).rejects.toMatchObject({
      message: 'Seu plano não permite esta ação.',
      status: 402,
    });
  });

  it('apiDownload baixa com fetch + blob enviando o token no cabeçalho', async () => {
    jest.useFakeTimers();
    setCookie('creator_auth_token', 'tok-123', 86400);
    const blob = new Blob(['conteudo']);
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      blob: async () => blob,
      headers: { get: () => 'attachment; filename="curso-5.csv"' },
    });
    const createUrl = jest.fn().mockReturnValue('blob:x');
    const revokeUrl = jest.fn();
    window.URL.createObjectURL = createUrl;
    window.URL.revokeObjectURL = revokeUrl;
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await apiDownload('/api/v1/teams/1/materials/5/download', 'padrao.bin');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/teams/1/materials/5/download',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok-123' }) })
    );
    expect(createUrl).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalled();
    // O endereço do arquivo é liberado só depois de um instante, não logo após o clique
    expect(revokeUrl).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(revokeUrl).toHaveBeenCalledWith('blob:x');
    jest.useRealTimers();
    clickSpy.mockRestore();
  });

  it('apiDownload com erro lança a mensagem do servidor e não baixa nada', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Material não encontrado.' }),
    });
    window.URL.createObjectURL = jest.fn();

    await expect(apiDownload('/api/v1/teams/1/materials/9/download', 'x')).rejects.toMatchObject({
      message: 'Material não encontrado.',
      status: 404,
    });
    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
  });
});

describe('fileNameFromDisposition (M2)', () => {
  it('prefere filename* (UTF-8) ao nome de reserva em ASCII', () => {
    const header = `attachment; filename="roteiro_final.pdf"; filename*=UTF-8''roteiro%20final%20-%20vers%C3%A3o.pdf`;
    expect(fileNameFromDisposition(header)).toBe('roteiro final - versão.pdf');
  });

  it('usa filename simples quando não há filename*', () => {
    expect(fileNameFromDisposition('attachment; filename="curso-5.csv"')).toBe('curso-5.csv');
    expect(fileNameFromDisposition('attachment; filename=guia.pdf')).toBe('guia.pdf');
  });

  it('sem cabeçalho devolve null (vale o nome padrão)', () => {
    expect(fileNameFromDisposition(null)).toBeNull();
    expect(fileNameFromDisposition('attachment')).toBeNull();
  });

  it('apiDownload usa o nome de filename* do cabeçalho', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      blob: async () => new Blob(['x']),
      headers: { get: () => `attachment; filename="a_b.pdf"; filename*=UTF-8''a%C3%A7%C3%A3o.pdf` },
    });
    window.URL.createObjectURL = jest.fn().mockReturnValue('blob:y');
    window.URL.revokeObjectURL = jest.fn();
    let downloaded = '';
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloaded = this.download;
    });

    await apiDownload('/api/v1/teams/1/materials/5/download', 'padrao.bin');

    expect(downloaded).toBe('ação.pdf');
    clickSpy.mockRestore();
  });
});
