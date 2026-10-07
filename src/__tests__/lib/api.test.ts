import { setCookie, getCookie, deleteCookie, apiRequest, handleUnauthorized } from '@/lib/api';

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

  // IT-13: Token expirado (401/403) limpa cookies e dispara tratamento de sessão
  it('IT-13: apiRequest com resposta 401 Unauthorized limpa cookies e dispara invalidation', async () => {
    setCookie('creator_auth_token', 'expired-token', 86400);
    setCookie('creator_user_id', '1', 86400);

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Token expirado' }),
    });

    await expect(apiRequest('GET', '/api/v1/kanban')).rejects.toThrow(
      'Sessão expirada ou não autorizada. Redirecionando...'
    );

    expect(getCookie('creator_auth_token')).toBeNull();
    expect(getCookie('creator_user_id')).toBeNull();
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
});
