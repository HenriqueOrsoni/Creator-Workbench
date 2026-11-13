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
const download = apiModule.apiDownload as jest.Mock;
const openInline = apiModule.apiOpenInline as jest.Mock;
const T = '/api/v1/teams/7';

function apiError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function file(name: string, size = 10, type = 'application/pdf') {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

const matDto = (id: number, name = 'guia.pdf') => ({
  id,
  cardId: 5,
  fileName: name,
  contentType: 'application/pdf',
  sizeBytes: 1024,
  uploadedBy: { userId: 3, name: 'Ana' },
  createdAt: '2026-11-12T10:00:00Z',
  downloadUrl: `/api/v1/teams/7/materials/${id}/download`,
});

describe('Store M2: materiais, revisão e resumo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetStore();
    useAppStore.setState({ activeTeamId: '7' });
  });

  describe('upload de material', () => {
    it('envia multipart no campo file e coloca o novo material no topo (mais novo primeiro)', async () => {
      useAppStore.setState({ cardMaterials: { '5': [{ id: '1', cardId: '5', fileName: 'velho.pdf', contentType: 'application/pdf', sizeBytes: 1, createdAt: 'x' }] } });
      api.mockResolvedValueOnce(matDto(2, 'novo.pdf'));

      const result = await useAppStore.getState().uploadMaterial('5', file('novo.pdf'));

      expect(result?.id).toBe('2');
      const [method, path, body] = api.mock.calls[0];
      expect(method).toBe('POST');
      expect(path).toBe(`${T}/cards/5/materials`);
      expect(body).toBeInstanceOf(FormData);
      expect((body as FormData).get('file')).toBeInstanceOf(File);
      expect(useAppStore.getState().cardMaterials['5'].map((m) => m.id)).toEqual(['2', '1']);
      expect(toast.success).toHaveBeenCalled();
    });

    it('repassa o progresso do envio para a API (XHR) quando há callback', async () => {
      api.mockResolvedValueOnce(matDto(2));
      const onProgress = jest.fn();
      await useAppStore.getState().uploadMaterial('5', file('a.pdf'), onProgress);
      expect(api.mock.calls[0][3]).toEqual({ onUploadProgress: onProgress });
    });

    it('atualiza materialsCount do card no quadro', async () => {
      useAppStore.setState({
        board: { teamId: '7', teamName: 'E', columns: [{ id: '1', name: 'A', sortOrder: 0, cards: [{ id: '5', title: 'P', description: '', type: 'PROJECT', sortOrder: 0, progress: 0, tasksTotal: 0, tasksDone: 0, materialsCount: 0, createdAt: 'x' }] }] },
      });
      api.mockResolvedValueOnce(matDto(2));
      await useAppStore.getState().uploadMaterial('5', file('a.pdf'));
      expect(useAppStore.getState().board!.columns[0].cards[0].materialsCount).toBe(1);
    });

    it.each([
      ['extensão não permitida', file('virus.exe', 10, 'application/x-msdownload'), 'Formato não suportado'],
      ['arquivo acima de 20 MB', file('grande.pdf', 20 * 1024 * 1024 + 1), 'O arquivo excede o limite de 20 MB.'],
      ['arquivo vazio', file('vazio.pdf', 0), 'O arquivo está vazio.'],
    ])('valida no cliente: %s (não chama o servidor)', async (_n, f, msg) => {
      const result = await useAppStore.getState().uploadMaterial('5', f);
      expect(result).toBeNull();
      expect(api).not.toHaveBeenCalled();
      expect((toast.error as jest.Mock).mock.calls[0][0]).toContain(msg);
    });

    it.each([
      [413, 'O arquivo excede o limite de 20 MB.'],
      [415, 'Tipo de arquivo não permitido.'],
      [400, 'Envie um arquivo não vazio no campo "file".'],
      [403, 'Você não tem permissão para esta ação.'],
    ])('erro %s mostra a mensagem do servidor e não altera a lista', async (status, message) => {
      api.mockRejectedValueOnce(apiError(message, status));
      const result = await useAppStore.getState().uploadMaterial('5', file('a.pdf'));
      expect(result).toBeNull();
      expect(toast.error).toHaveBeenCalledWith(message);
      expect(toast.success).not.toHaveBeenCalled();
      expect(useAppStore.getState().cardMaterials['5']).toBeUndefined();
    });
  });

  describe('lista, exclusão e download', () => {
    it('lista os materiais na ordem do servidor', async () => {
      api.mockResolvedValueOnce([matDto(3), matDto(2)]);
      const list = await useAppStore.getState().fetchCardMaterials('5');
      expect(list.map((m) => m.id)).toEqual(['3', '2']);
      expect(api).toHaveBeenCalledWith('GET', `${T}/cards/5/materials`);
    });

    it('falha na lista mostra a mensagem e mantém o que havia', async () => {
      api.mockRejectedValueOnce(apiError('Card não encontrado.', 404));
      const list = await useAppStore.getState().fetchCardMaterials('5');
      expect(list).toEqual([]);
      expect(toast.error).toHaveBeenCalledWith('Card não encontrado.');
    });

    it('exclui e ajusta a lista; em caso de 403 mantém o material', async () => {
      useAppStore.setState({ cardMaterials: { '5': [{ id: '1', cardId: '5', fileName: 'a.pdf', contentType: 'x', sizeBytes: 1, createdAt: 'x' }] } });
      api.mockRejectedValueOnce(apiError('Sem permissão.', 403));
      expect(await useAppStore.getState().deleteMaterial('1', '5')).toBe(false);
      expect(useAppStore.getState().cardMaterials['5']).toHaveLength(1);
      expect(toast.error).toHaveBeenCalledWith('Sem permissão.');

      api.mockResolvedValueOnce(null);
      expect(await useAppStore.getState().deleteMaterial('1', '5')).toBe(true);
      expect(api).toHaveBeenLastCalledWith('DELETE', `${T}/materials/1`);
      expect(useAppStore.getState().cardMaterials['5']).toHaveLength(0);
    });

    it('visualizar chama apiOpenInline com a rota de download e mostra o erro do servidor se falhar', async () => {
      const m = { id: '1', cardId: '5', fileName: 'guia.pdf', contentType: 'application/pdf', sizeBytes: 1, createdAt: 'x' };
      openInline.mockResolvedValueOnce('opened');
      expect(await useAppStore.getState().previewMaterial(m)).toBe(true);
      expect(openInline).toHaveBeenCalledWith(`${T}/materials/1/download`, 'guia.pdf');
      openInline.mockRejectedValueOnce(apiError('Material não encontrado.', 404));
      expect(await useAppStore.getState().previewMaterial(m)).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Material não encontrado.');
    });

    it('baixa com apiDownload (token no cabeçalho) e mostra o erro do servidor', async () => {
      const mat = { id: '9', cardId: '5', fileName: 'guia.pdf', contentType: 'x', sizeBytes: 1, createdAt: 'x' };
      download.mockResolvedValueOnce(undefined);
      expect(await useAppStore.getState().downloadMaterial(mat)).toBe(true);
      expect(download).toHaveBeenCalledWith(`${T}/materials/9/download`, 'guia.pdf');

      download.mockRejectedValueOnce(apiError('Material não encontrado.', 404));
      expect(await useAppStore.getState().downloadMaterial(mat)).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Material não encontrado.');
    });
  });

  describe('vínculo de material com aula', () => {
    const base = `${T}/courses/1/modules/2/lessons/3/materials`;

    it('vincula enviando materialId e recarrega o curso', async () => {
      api.mockImplementation((method: string, path: string) =>
        Promise.resolve(path === `${T}/courses/1` ? { id: 1, teamId: 7, title: 'C', modules: [] } : { id: 3 }));
      expect(await useAppStore.getState().linkMaterialToLesson('1', '2', '3', '9')).toBe(true);
      expect(api).toHaveBeenCalledWith('POST', base, { materialId: 9 });
      expect(api).toHaveBeenCalledWith('GET', `${T}/courses/1`);
    });

    it.each([
      [409, 'Este material já está vinculado à aula.'],
      [400, 'O material pertence a outra equipe.'],
    ])('vincular com erro %s mostra a mensagem e retorna false', async (status, message) => {
      api.mockRejectedValueOnce(apiError(message, status));
      expect(await useAppStore.getState().linkMaterialToLesson('1', '2', '3', '9')).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(message);
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('desvincula com DELETE e, se falhar, mostra o erro', async () => {
      api.mockImplementation((method: string, path: string) =>
        Promise.resolve(method === 'GET' ? { id: 1, teamId: 7, title: 'C', modules: [] } : null));
      expect(await useAppStore.getState().unlinkMaterialFromLesson('1', '2', '3', '9')).toBe(true);
      expect(api).toHaveBeenCalledWith('DELETE', `${base}/9`);

      api.mockReset();
      api.mockRejectedValueOnce(apiError('Material não encontrado.', 404));
      expect(await useAppStore.getState().unlinkMaterialFromLesson('1', '2', '3', '9')).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Material não encontrado.');
    });

    it('mapeia materials da aula no detalhe do curso', async () => {
      api.mockResolvedValueOnce({
        id: 1, teamId: 7, title: 'C',
        modules: [{ id: 2, courseId: 1, title: 'M', lessons: [{ id: 3, moduleId: 2, title: 'A', type: 'VIDEO', published: false, materials: [matDto(9, 'x.pdf')] }] }],
      });
      await useAppStore.getState().fetchCourseDetails('1');
      expect(useAppStore.getState().activeCourse!.modules[0].lessons[0].materials![0]).toMatchObject({ id: '9', fileName: 'x.pdf' });
    });
  });

  describe('revisão', () => {
    it('mapeia materialsCount e reviewStatus do card no quadro', async () => {
      api.mockResolvedValueOnce({
        teamId: 7, teamName: 'E',
        columns: [{ id: 1, name: 'A', sortOrder: 0, cards: [{ id: 5, title: 'P', type: 'PROJECT', sortOrder: 0, reviewStatus: 'CHANGES_REQUESTED', materialsCount: 4, createdAt: 'x' }] }],
      });
      await useAppStore.getState().fetchBoard();
      const card = useAppStore.getState().board!.columns[0].cards[0];
      expect(card.reviewStatus).toBe('CHANGES_REQUESTED');
      expect(card.materialsCount).toBe(4);
    });

    it('lista as revisões (mais nova primeiro) com revisor nulo tratado', async () => {
      api.mockResolvedValueOnce([
        { id: 2, cardId: 5, decision: 'APPROVED', comment: null, reviewer: { userId: 4, name: 'Rui' }, createdAt: 'b' },
        { id: 1, cardId: 5, decision: 'CHANGES_REQUESTED', comment: 'Ajustar', reviewer: null, createdAt: 'a' },
      ]);
      const list = await useAppStore.getState().fetchCardReviews('5');
      expect(api).toHaveBeenCalledWith('GET', `${T}/cards/5/reviews`);
      expect(list.map((r) => r.id)).toEqual(['2', '1']);
      expect(list[0].reviewer).toEqual({ userId: '4', name: 'Rui' });
      expect(list[1].reviewer).toBeNull();
    });

    it('registra a decisão, mostra sucesso e recarrega quadro e revisões', async () => {
      api.mockImplementation((method: string, path: string) =>
        Promise.resolve(path.endsWith('/board') ? { teamId: 7, teamName: 'E', columns: [] } : method === 'GET' ? [] : { id: 1 }));
      const ok = await useAppStore.getState().submitCardReview('5', 'CHANGES_REQUESTED', 'Ajustar o roteiro');
      expect(ok).toBe(true);
      expect(api).toHaveBeenCalledWith('POST', `${T}/cards/5/reviews`, { decision: 'CHANGES_REQUESTED', comment: 'Ajustar o roteiro' });
      expect(api).toHaveBeenCalledWith('GET', `${T}/board`);
      expect(api).toHaveBeenCalledWith('GET', `${T}/cards/5/reviews`);
      expect(toast.success).toHaveBeenCalled();
    });

    it.each([
      [400, 'Informe o comentário da revisão.'],
      [403, 'Somente Administrador e Revisor podem revisar.'],
    ])('erro %s mostra a mensagem do servidor, sem sucesso e sem recarregar', async (status, message) => {
      api.mockRejectedValueOnce(apiError(message, status));
      const ok = await useAppStore.getState().submitCardReview('5', 'APPROVED', '');
      expect(ok).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(message);
      expect(toast.success).not.toHaveBeenCalled();
      expect(api).toHaveBeenCalledTimes(1);
    });
  });

  describe('resumo', () => {
    const summaryDto = { cardId: 5, summary: 'Resumo <b>novo</b>', generatedAt: '2026-11-12T10:00:00Z', basedOn: 'SCRIPT' };

    it('gera o resumo e guarda como veio (texto, sem interpretar marcação)', async () => {
      api.mockResolvedValueOnce(summaryDto);
      const s = await useAppStore.getState().generateCardSummary('5');
      expect(api).toHaveBeenCalledWith('POST', `${T}/cards/5/summary`);
      expect(s?.summary).toBe('Resumo <b>novo</b>');
      expect(useAppStore.getState().cardSummaries['5'].basedOn).toBe('SCRIPT');
    });

    it('503 mantém o resumo anterior e mostra a mensagem do servidor', async () => {
      const previous = { cardId: '5', summary: 'Resumo antigo', generatedAt: 'x', basedOn: 'SCRIPT' };
      useAppStore.setState({ cardSummaries: { '5': previous } });
      api.mockRejectedValueOnce(apiError('Não foi possível gerar o resumo agora. Tente novamente.', 503));

      const s = await useAppStore.getState().generateCardSummary('5');

      expect(s).toBeNull();
      expect(useAppStore.getState().cardSummaries['5']).toEqual(previous);
      expect(toast.error).toHaveBeenCalledWith('Não foi possível gerar o resumo agora. Tente novamente.');
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('400 (menos de 100 palavras) mostra a mensagem e não grava resumo', async () => {
      const message = 'Dados insuficientes para gerar o resumo: escreva pelo menos 100 palavras no roteiro.';
      api.mockRejectedValueOnce(apiError(message, 400));
      expect(await useAppStore.getState().generateCardSummary('5')).toBeNull();
      expect(toast.error).toHaveBeenCalledWith(message);
      expect(useAppStore.getState().cardSummaries['5']).toBeUndefined();
    });

    it('403 mostra a mensagem do servidor', async () => {
      api.mockRejectedValueOnce(apiError('Você não tem permissão para esta ação.', 403));
      await useAppStore.getState().generateCardSummary('5');
      expect(toast.error).toHaveBeenCalledWith('Você não tem permissão para esta ação.');
    });

    it('GET devolve o último resumo', async () => {
      api.mockResolvedValueOnce(summaryDto);
      const s = await useAppStore.getState().fetchCardSummary('5');
      expect(s?.generatedAt).toBe('2026-11-12T10:00:00Z');
    });

    it('GET 404 é estado vazio: sem toast de erro e retorna null', async () => {
      api.mockRejectedValueOnce(apiError('Nenhum resumo gerado para este projeto.', 404));
      const s = await useAppStore.getState().fetchCardSummary('5');
      expect(s).toBeNull();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('GET com outro erro (500) mostra a mensagem', async () => {
      api.mockRejectedValueOnce(apiError('Erro interno. Tente novamente mais tarde.', 500));
      await useAppStore.getState().fetchCardSummary('5');
      expect(toast.error).toHaveBeenCalledWith('Erro interno. Tente novamente mais tarde.');
    });
  });
});
