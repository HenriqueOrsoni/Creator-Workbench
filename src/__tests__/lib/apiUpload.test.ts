import { apiRequest, apiOpenInline, registerApiHooks, NETWORK_ERROR_MESSAGE, ApiError } from '@/lib/api';

class FakeXHR {
  static last: FakeXHR;
  method = ''; url = ''; headers: Record<string, string> = {}; body: unknown;
  status = 0; responseText = ''; responseType = '';
  upload: { onprogress: ((e: Partial<ProgressEvent>) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null; onerror: (() => void) | null = null;
  onabort: (() => void) | null = null; ontimeout: (() => void) | null = null;
  constructor() { FakeXHR.last = this; }
  open(m: string, u: string) { this.method = m; this.url = u; }
  setRequestHeader(k: string, v: string) { this.headers[k] = v; }
  send(b: unknown) { this.body = b; }
  respond(status: number, text = '') { this.status = status; this.responseText = text; this.onload?.(); }
}

describe('api.ts: envio com progresso real (XMLHttpRequest)', () => {
  const OriginalXHR = global.XMLHttpRequest;
  beforeEach(() => {
    (global as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = FakeXHR;
    document.cookie = 'creator_auth_token=tok123; path=/';
    registerApiHooks({});
  });
  afterEach(() => {
    global.XMLHttpRequest = OriginalXHR;
    document.cookie = 'creator_auth_token=; path=/; max-age=0';
  });

  const form = () => { const f = new FormData(); f.append('file', new File(['x'], 'a.pdf')); return f; };

  it('envia com o token no cabeçalho, informa o progresso (máx. 99 antes da resposta) e chega a 100 no sucesso', async () => {
    const onWrite = jest.fn();
    registerApiHooks({ onWrite });
    const seen: number[] = [];
    const promise = apiRequest('POST', '/api/v1/teams/7/cards/5/materials', form(), { onUploadProgress: (p) => seen.push(p) });
    const xhr = FakeXHR.last;
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toMatch(/\/api\/v1\/teams\/7\/cards\/5\/materials$/);
    expect(xhr.headers.Authorization).toBe('Bearer tok123');
    expect(xhr.headers['Content-Type']).toBeUndefined();
    expect(onWrite).toHaveBeenCalled();

    xhr.upload.onprogress!({ lengthComputable: true, loaded: 25, total: 100 });
    xhr.upload.onprogress!({ lengthComputable: true, loaded: 100, total: 100 });
    expect(seen).toEqual([25, 99]);

    xhr.respond(200, JSON.stringify({ id: 9, fileName: 'a.pdf' }));
    await expect(promise).resolves.toEqual({ id: 9, fileName: 'a.pdf' });
    expect(seen).toEqual([25, 99, 100]);
  });

  it('413 rejeita com o {message} do servidor e nunca informa 100%', async () => {
    const seen: number[] = [];
    const promise = apiRequest('POST', '/x', form(), { onUploadProgress: (p) => seen.push(p) });
    FakeXHR.last.upload.onprogress!({ lengthComputable: true, loaded: 50, total: 100 });
    FakeXHR.last.respond(413, JSON.stringify({ message: 'O arquivo excede o limite de 20 MB.' }));
    const error = await promise.catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(413);
    expect(error.message).toBe('O arquivo excede o limite de 20 MB.');
    expect(seen).not.toContain(100);
  });

  it('403 usa a mensagem do servidor; 401 chama o gancho de sessão expirada', async () => {
    const onUnauthorized = jest.fn();
    registerApiHooks({ onUnauthorized });
    const p403 = apiRequest('POST', '/x', form(), { onUploadProgress: () => {} });
    FakeXHR.last.respond(403, JSON.stringify({ message: 'Sem permissão.' }));
    await expect(p403).rejects.toMatchObject({ status: 403, message: 'Sem permissão.' });

    const p401 = apiRequest('POST', '/x', form(), { onUploadProgress: () => {} });
    FakeXHR.last.respond(401, '');
    await expect(p401).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it('falha de rede vira a mensagem em português e não informa progresso', async () => {
    const seen: number[] = [];
    const promise = apiRequest('POST', '/x', form(), { onUploadProgress: (p) => seen.push(p) });
    FakeXHR.last.onerror!();
    await expect(promise).rejects.toMatchObject({ status: 0, message: NETWORK_ERROR_MESSAGE });
    expect(seen).toEqual([]);
  });

  it('sem onUploadProgress continua usando fetch', async () => {
    const original = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: 1 }) });
    await expect(apiRequest('POST', '/x', form())).resolves.toEqual({ ok: 1 });
    expect(global.fetch).toHaveBeenCalled();
    global.fetch = original;
  });
});

describe('api.ts: abrir no navegador (?inline=true)', () => {
  const originalFetch = global.fetch;
  const originalOpen = window.open;
  beforeEach(() => {
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = jest.fn(() => 'blob:abc');
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, status: 200, blob: async () => new Blob(['x'], { type: 'application/pdf' }), headers: { get: () => null },
    });
  });
  afterEach(() => { global.fetch = originalFetch; window.open = originalOpen; jest.useRealTimers(); });

  it('busca com ?inline=true, abre a aba e revoga a URL depois de 60 s', async () => {
    jest.useFakeTimers();
    const tab = { opener: 'x' };
    window.open = jest.fn().mockReturnValue(tab) as unknown as typeof window.open;
    await expect(apiOpenInline('/api/v1/teams/7/materials/1/download', 'a.pdf')).resolves.toBe('opened');
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toMatch(/\/materials\/1\/download\?inline=true$/);
    expect(window.open).toHaveBeenCalledWith('blob:abc', '_blank');
    expect(tab.opener).toBeNull();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    jest.advanceTimersByTime(60_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:abc');
  });

  it('tipo fora da lista de prévia (ex.: text/html) baixa em vez de abrir', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, status: 200, blob: async () => new Blob(['<p>x</p>'], { type: 'text/html; charset=utf-8' }), headers: { get: () => null },
    });
    window.open = jest.fn() as unknown as typeof window.open;
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await expect(apiOpenInline('/api/v1/teams/7/materials/1/download', 'a.html')).resolves.toBe('downloaded');
    expect(window.open).not.toHaveBeenCalled();
    click.mockRestore();
  });

  it('pop-up bloqueado cai no download', async () => {
    window.open = jest.fn().mockReturnValue(null) as unknown as typeof window.open;
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await expect(apiOpenInline('/api/v1/teams/7/materials/1/download', 'a.pdf')).resolves.toBe('downloaded');
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('erro do servidor não abre nada', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ message: 'Material não encontrado.' }) });
    window.open = jest.fn() as unknown as typeof window.open;
    await expect(apiOpenInline('/x', 'a.pdf')).rejects.toMatchObject({ status: 404, message: 'Material não encontrado.' });
    expect(window.open).not.toHaveBeenCalled();
  });
});
