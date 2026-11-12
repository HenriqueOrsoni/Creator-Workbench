import { useAppStore } from '@/store/useAppStore';
import * as apiModule from '@/lib/api';
import { toast } from 'sonner';

// Telas de marcos futuros ficam ligadas aqui para testar o comportamento delas
jest.mock('@/lib/features', () => ({
  FEATURES: {
    materials: true, summary: true, review: true, invites: true, coursePublish: true,
    courseCsv: true, teamManage: true, accountSecurity: true, alerts: true,
  },
}));

jest.mock('@/lib/api', () => ({
  apiRequest: jest.fn(),
  apiDownload: jest.fn(),
  getCookie: jest.fn(),
  setCookie: jest.fn(),
  deleteCookie: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const api = apiModule.apiRequest as jest.Mock;
const download = apiModule.apiDownload as jest.Mock;

type Routes = Record<string, unknown>;

/**
 * Responde cada chamada pelo par "MÉTODO caminho". Valor Error = a requisição falha com essa mensagem.
 * Qualquer chamada fora do mapa derruba o teste, assim nenhuma rota inesperada passa despercebida.
 */
function mockRoutes(routes: Routes) {
  api.mockImplementation((method: string, path: string) => {
    const key = `${method} ${path}`;
    if (!(key in routes)) {
      return Promise.reject(new Error(`Rota inesperada: ${key}`));
    }
    const value = routes[key];
    return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
  });
}

const boardResponse = {
  teamId: 7,
  teamName: 'Estúdio Alfa',
  columns: [
    {
      id: 10,
      name: 'Pesquisa',
      sortOrder: 0,
      cards: [
        {
          id: 100,
          uuid: 'uuid-100',
          teamId: 7,
          title: 'Videoaula de SQL',
          description: 'Joins',
          type: 'PROJECT',
          columnId: 10,
          sortOrder: 0,
          progress: 50,
          tasksTotal: 2,
          tasksDone: 1,
          targetAudience: 'Iniciantes',
          pedagogicalObjective: 'Entender joins na prática',
          tag: 'Tutorial',
          tagId: 3,
          tagColor: '#2E7D32',
          dueDate: '2026-11-20',
          columnSince: '2026-11-10T14:00:00Z',
          createdAt: '2026-11-01T10:00:00Z',
          updatedAt: '2026-11-10T14:00:00Z',
          tasks: [
            {
              id: 501,
              cardId: 100,
              title: 'Gravar introdução',
              completed: true,
              sortOrder: 0,
              createdAt: '2026-11-02T10:00:00Z',
              assignee: { memberId: 21, userId: 4, name: 'Ana Souza' },
              dueDate: '2026-11-15',
            },
            {
              id: 502,
              cardId: 100,
              title: 'Editar vídeo',
              completed: false,
              sortOrder: 1,
              createdAt: '2026-11-02T11:00:00Z',
              assignee: null,
              dueDate: null,
            },
          ],
        },
      ],
    },
    { id: 11, name: 'Roteiro', sortOrder: 1, cards: [] },
  ],
};

const T = '/api/v1/teams/7';

describe('Store Zustand: dados vêm sempre da API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.mockReset();
    download.mockReset();
    useAppStore.getState().resetStore();
    useAppStore.setState({ activeTeamId: '7' });
  });

  describe('Quadro e cards (campos da M1)', () => {
    it('FT-01: fetchBoard mapeia uuid, etiqueta, columnSince e tarefas com responsável e prazo', async () => {
      mockRoutes({ [`GET ${T}/board`]: boardResponse });

      await useAppStore.getState().fetchBoard();

      const board = useAppStore.getState().board!;
      expect(board.teamName).toBe('Estúdio Alfa');
      expect(board.columns.map(c => c.id)).toEqual(['10', '11']);
      const card = board.columns[0].cards[0];
      expect(card).toMatchObject({
        id: '100',
        uuid: 'uuid-100',
        tag: 'Tutorial',
        tagId: '3',
        tagColor: '#2E7D32',
        columnSince: '2026-11-10T14:00:00Z',
        progress: 50,
        dueDate: '2026-11-20',
        columnId: '10',
        columnName: 'Pesquisa',
      });
      expect(card.tasks![0].assignee).toEqual({ memberId: '21', userId: '4', name: 'Ana Souza' });
      expect(card.tasks![0].dueDate).toBe('2026-11-15');
      expect(card.tasks![1].assignee).toBeNull();
      expect(card.tasks![1].dueDate).toBeNull();
      // Seleciona o primeiro projeto para o estúdio de roteiro
      expect(useAppStore.getState().selectedProjectId).toBe('100');
      expect(useAppStore.getState().items).toHaveLength(1);
    });

    it('FT-06: erro ao carregar o quadro não altera o estado e mostra a mensagem do servidor', async () => {
      mockRoutes({ [`GET ${T}/board`]: boardResponse });
      await useAppStore.getState().fetchBoard();

      mockRoutes({ [`GET ${T}/board`]: new Error('Equipe não encontrada.') });
      await useAppStore.getState().fetchBoard();

      expect(toast.error).toHaveBeenCalledWith('Equipe não encontrada.');
      // O quadro anterior continua intacto
      expect(useAppStore.getState().board?.columns).toHaveLength(2);
    });

    it('FT-05: setSelectedProjectId atualiza o projeto selecionado', () => {
      useAppStore.getState().setSelectedProjectId('42');
      expect(useAppStore.getState().selectedProjectId).toBe('42');
    });

    it('BF-10: fetchTeams com erro não cria equipe falsa e mostra a mensagem', async () => {
      mockRoutes({ 'GET /api/v1/teams': new Error('Erro de conexão') });

      await useAppStore.getState().fetchTeams();

      expect(useAppStore.getState().teams).toEqual([]);
      expect(useAppStore.getState().activeTeam).toBeNull();
      expect(useAppStore.getState().error).toBe('Erro de conexão');
      expect(toast.error).toHaveBeenCalledWith('Erro de conexão');
    });

    it('BF-08: moveCard usa PATCH .../move e só recarrega o quadro se o servidor aceitou', async () => {
      mockRoutes({
        [`PATCH ${T}/cards/100/move`]: { id: 100 },
        [`GET ${T}/board`]: boardResponse,
      });

      const ok = await useAppStore.getState().moveCard('100', '11');

      expect(ok).toBe(true);
      expect(api).toHaveBeenCalledWith('PATCH', `${T}/cards/100/move`, { columnId: 11, sortOrder: 0 });
      expect(api).toHaveBeenCalledWith('GET', `${T}/board`);
    });

    it('moveCard com erro (403) mostra a mensagem e não recarrega nem altera o quadro', async () => {
      mockRoutes({ [`PATCH ${T}/cards/100/move`]: new Error('Seu papel na equipe não permite esta ação.') });

      const ok = await useAppStore.getState().moveCard('100', '11');

      expect(ok).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Seu papel na equipe não permite esta ação.');
      expect(api).toHaveBeenCalledTimes(1);
    });

    it('updateProject envia só título, público, objetivo e prazo (sem state/progress)', async () => {
      mockRoutes({ 'PUT /api/v1/kanban/100': { id: 100 }, [`GET ${T}/board`]: boardResponse });

      const ok = await useAppStore.getState().updateProject('100', 'Novo título', 'Iniciantes', 'Entender joins na prática', '');

      expect(ok).toBe(true);
      const putCall = api.mock.calls.find(c => c[0] === 'PUT');
      expect(putCall![2]).toEqual({
        title: 'Novo título',
        targetAudience: 'Iniciantes',
        pedagogicalObjective: 'Entender joins na prática',
        dueDate: '',
      });
      expect(putCall![2]).not.toHaveProperty('state');
      expect(putCall![2]).not.toHaveProperty('progress');
    });

    it('updateProject com erro devolve false, mostra a mensagem e não recarrega', async () => {
      mockRoutes({ 'PUT /api/v1/kanban/100': new Error('Apenas Administrador e Criador podem editar.') });

      const ok = await useAppStore.getState().updateProject('100', 'Título', 'Público', 'Objetivo longo o bastante');

      expect(ok).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Apenas Administrador e Criador podem editar.');
      expect(api).toHaveBeenCalledTimes(1);
    });
  });

  describe('Caixa de entrada (filtros do servidor e etiqueta)', () => {
    it('setIdeaFilters envia q, tagId e sort ao servidor', async () => {
      mockRoutes({ [`GET ${T}/ideas?q=podcast&tagId=3&sort=votes`]: [] });

      await useAppStore.getState().setIdeaFilters({ q: 'podcast', tagId: '3', sort: 'votes' });

      expect(api).toHaveBeenCalledWith('GET', `${T}/ideas?q=podcast&tagId=3&sort=votes`);
      expect(useAppStore.getState().ideaFilters).toEqual({ q: 'podcast', tagId: '3', sort: 'votes' });
    });

    it('fetchIdeas sem filtros usa sort=recent e mapeia etiqueta e votos', async () => {
      mockRoutes({
        [`GET ${T}/ideas?sort=recent`]: [
          { id: 9, uuid: 'u9', title: 'Ideia', description: '', tag: 'Podcast', tagId: 2, tagColor: '#1565C0', votes: 3, votedByMe: true, createdAt: '2026-11-01T10:00:00Z' },
        ],
      });

      await useAppStore.getState().fetchIdeas();

      expect(useAppStore.getState().ideas[0]).toMatchObject({ id: '9', type: 'IDEA', tagId: '2', tagColor: '#1565C0', votes: 3, votedByMe: true });
    });

    it('createInboxIdea envia tagId e atualiza a lista; com erro mostra a mensagem e não recarrega', async () => {
      mockRoutes({ [`POST ${T}/ideas`]: { id: 9, title: 'Ideia', createdAt: 'x' }, [`GET ${T}/ideas?sort=recent`]: [] });
      const created = await useAppStore.getState().createInboxIdea({ title: 'Ideia', tagId: 2 });
      expect(created?.id).toBe('9');
      expect(api).toHaveBeenCalledWith('POST', `${T}/ideas`, { title: 'Ideia', tagId: 2 });

      api.mockClear();
      mockRoutes({ [`POST ${T}/ideas`]: new Error('Etiqueta não encontrada.') });
      const failed = await useAppStore.getState().createInboxIdea({ title: 'Outra', tagId: 99 });
      expect(failed).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('Etiqueta não encontrada.');
      expect(api).toHaveBeenCalledTimes(1);
    });
  });

  describe('Etiquetas (somente da API, sem etiquetas falsas)', () => {
    it('fetchTeamTags usa só o que o servidor devolve e falha sem recolocar etiquetas padrão', async () => {
      mockRoutes({ [`GET ${T}/tags`]: [{ id: 3, name: 'Tutorial', color: '#2E7D32' }] });
      await useAppStore.getState().fetchTeamTags();
      expect(useAppStore.getState().teamTags).toEqual([{ id: '3', name: 'Tutorial', color: '#2E7D32' }]);

      mockRoutes({ [`GET ${T}/tags`]: new Error('Falha ao listar etiquetas.') });
      await useAppStore.getState().fetchTeamTags();
      // Carga em segundo plano: sem aviso na tela, a lista anterior continua
      expect(useAppStore.getState().teamTags).toHaveLength(1);
    });

    it('lista vazia do servidor continua vazia (não volta a lista padrão)', async () => {
      mockRoutes({ [`GET ${T}/tags`]: [] });
      await useAppStore.getState().fetchTeamTags();
      expect(useAppStore.getState().teamTags).toEqual([]);
    });

    it('createTeamTag cria pela API; nome duplicado (409) mostra a mensagem e não cria localmente', async () => {
      mockRoutes({ [`POST ${T}/tags`]: { id: 8, name: 'Webinar', color: '#FF5722' } });
      const created = await useAppStore.getState().createTeamTag(' Webinar ', '#FF5722');
      expect(created).toEqual({ id: '8', name: 'Webinar', color: '#FF5722' });
      expect(api).toHaveBeenCalledWith('POST', `${T}/tags`, { name: 'Webinar', color: '#FF5722' });

      mockRoutes({ [`POST ${T}/tags`]: new Error('Já existe uma etiqueta com esse nome.') });
      const dup = await useAppStore.getState().createTeamTag('Webinar', '#FF5722');
      expect(dup).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('Já existe uma etiqueta com esse nome.');
      expect(useAppStore.getState().teamTags).toHaveLength(1);
    });

    it('updateTeamTag usa PATCH, atualiza a lista e recarrega quadro e ideias', async () => {
      useAppStore.setState({ teamTags: [{ id: '3', name: 'Tutorial', color: '#2E7D32' }] });
      mockRoutes({
        [`PATCH ${T}/tags/3`]: { id: 3, name: 'Tutoriais', color: '#112233' },
        [`GET ${T}/board`]: boardResponse,
        [`GET ${T}/ideas?sort=recent`]: [],
      });

      const ok = await useAppStore.getState().updateTeamTag('3', { name: 'Tutoriais', color: '#112233' });

      expect(ok).toBe(true);
      expect(useAppStore.getState().teamTags[0]).toEqual({ id: '3', name: 'Tutoriais', color: '#112233' });
    });

    it('updateTeamTag com erro (403 Revisor/Criador) mantém a etiqueta e mostra a mensagem', async () => {
      useAppStore.setState({ teamTags: [{ id: '3', name: 'Tutorial', color: '#2E7D32' }] });
      mockRoutes({ [`PATCH ${T}/tags/3`]: new Error('Apenas o Administrador gerencia etiquetas.') });

      const ok = await useAppStore.getState().updateTeamTag('3', { name: 'X' });

      expect(ok).toBe(false);
      expect(useAppStore.getState().teamTags[0].name).toBe('Tutorial');
      expect(toast.error).toHaveBeenCalledWith('Apenas o Administrador gerencia etiquetas.');
    });

    it('deleteTeamTag remove só depois do 204; com erro a etiqueta permanece', async () => {
      useAppStore.setState({ teamTags: [{ id: '3', name: 'Tutorial', color: '#2E7D32' }] });
      mockRoutes({ [`DELETE ${T}/tags/3`]: new Error('Apenas o Administrador gerencia etiquetas.') });
      expect(await useAppStore.getState().deleteTeamTag('3')).toBe(false);
      expect(useAppStore.getState().teamTags).toHaveLength(1);

      mockRoutes({ [`DELETE ${T}/tags/3`]: null, [`GET ${T}/board`]: boardResponse, [`GET ${T}/ideas?sort=recent`]: [] });
      expect(await useAppStore.getState().deleteTeamTag('3')).toBe(true);
      expect(useAppStore.getState().teamTags).toHaveLength(0);
    });
  });

  describe('Tarefas e colunas (edição e ordem)', () => {
    beforeEach(async () => {
      mockRoutes({ [`GET ${T}/board`]: boardResponse });
      await useAppStore.getState().fetchBoard();
      api.mockClear();
    });

    it('updateCardTaskDetails envia assigneeMemberId e dueDate por PATCH e recarrega o quadro', async () => {
      mockRoutes({ [`PATCH ${T}/cards/100/tasks/502`]: { id: 502 }, [`GET ${T}/board`]: boardResponse });

      const ok = await useAppStore.getState().updateCardTaskDetails('100', '502', { assigneeMemberId: 21, dueDate: '2026-11-18' });

      expect(ok).toBe(true);
      expect(api).toHaveBeenCalledWith('PATCH', `${T}/cards/100/tasks/502`, { assigneeMemberId: 21, dueDate: '2026-11-18' });
      expect(toast.success).toHaveBeenCalledWith('Tarefa atualizada com sucesso!');
    });

    it('updateCardTaskDetails com erro não altera a tarefa nem mostra sucesso', async () => {
      mockRoutes({ [`PATCH ${T}/cards/100/tasks/502`]: new Error('Prazo inválido. Use o formato AAAA-MM-DD.') });

      const ok = await useAppStore.getState().updateCardTaskDetails('100', '502', { dueDate: 'ontem' });

      expect(ok).toBe(false);
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Prazo inválido. Use o formato AAAA-MM-DD.');
      expect(useAppStore.getState().board!.columns[0].cards[0].tasks![1].dueDate).toBeNull();
    });

    it('reorderCardTasks envia os ids numéricos; com erro mantém a ordem original', async () => {
      mockRoutes({ [`PUT ${T}/cards/100/tasks/order`]: new Error('Tarefa de outro card.') });
      const ok = await useAppStore.getState().reorderCardTasks('100', ['502', '501']);
      expect(ok).toBe(false);
      expect(api).toHaveBeenCalledWith('PUT', `${T}/cards/100/tasks/order`, { taskIds: [502, 501] });
      expect(useAppStore.getState().board!.columns[0].cards[0].tasks!.map(t => t.id)).toEqual(['501', '502']);
    });

    it('reorderColumns usa PUT .../columns/order e só muda o quadro com a resposta do servidor', async () => {
      mockRoutes({ [`PUT ${T}/columns/order`]: new Error('Apenas o Administrador pode reordenar colunas.') });
      expect(await useAppStore.getState().reorderColumns(['11', '10'])).toBe(false);
      expect(api).toHaveBeenCalledWith('PUT', `${T}/columns/order`, { columnIds: [11, 10] });
      expect(useAppStore.getState().board!.columns.map(c => c.id)).toEqual(['10', '11']);

      const reordered = { ...boardResponse, columns: [boardResponse.columns[1], boardResponse.columns[0]] };
      mockRoutes({ [`PUT ${T}/columns/order`]: [], [`GET ${T}/board`]: reordered });
      expect(await useAppStore.getState().reorderColumns(['11', '10'])).toBe(true);
      expect(useAppStore.getState().board!.columns.map(c => c.id)).toEqual(['11', '10']);
    });

    it('fetchCardHistory mapeia a resposta; com erro devolve lista vazia sem inventar "Você"', async () => {
      mockRoutes({
        [`GET ${T}/cards/100/history`]: [
          { columnId: 11, columnName: 'Roteiro', enteredAt: '2026-11-10T14:00:00Z', movedBy: { userId: 4, name: 'Ana Souza' } },
          { columnId: 10, columnName: 'Pesquisa', enteredAt: '2026-11-01T10:00:00Z', movedBy: null },
        ],
      });
      const history = await useAppStore.getState().fetchCardHistory('100');
      expect(history).toEqual([
        { columnId: '11', columnName: 'Roteiro', enteredAt: '2026-11-10T14:00:00Z', movedBy: { userId: '4', name: 'Ana Souza' } },
        { columnId: '10', columnName: 'Pesquisa', enteredAt: '2026-11-01T10:00:00Z', movedBy: null },
      ]);

      mockRoutes({ [`GET ${T}/cards/100/history`]: new Error('Card não encontrado.') });
      expect(await useAppStore.getState().fetchCardHistory('100')).toEqual([]);
      expect(toast.error).toHaveBeenCalledWith('Card não encontrado.');
    });
  });

  describe('Cursos (PATCH e sem sucesso falso)', () => {
    const courseDetail = {
      id: 5, teamId: 7, title: 'Curso SQL', description: 'Do zero', status: 'DRAFT', createdAt: '2026-11-01T10:00:00Z',
      modules: [
        { id: 51, courseId: 5, title: 'Módulo 1', sortOrder: 0, lessons: [
          { id: 61, moduleId: 51, title: 'Aula 1', type: 'VIDEO', published: false, sortOrder: 0, contentUrl: 'https://youtu.be/abc', description: 'Intro', materials: [] },
          { id: 62, moduleId: 51, title: 'Aula 2', type: 'TEXT', published: false, sortOrder: 1 },
        ] },
      ],
    };

    beforeEach(async () => {
      mockRoutes({ [`GET ${T}/courses/5`]: courseDetail });
      await useAppStore.getState().fetchCourseDetails('5');
      api.mockClear();
    });

    it('fetchCourseDetails mapeia status, link e descrição das aulas', () => {
      const lesson = useAppStore.getState().activeCourse!.modules[0].lessons[0];
      expect(lesson).toMatchObject({ contentUrl: 'https://youtu.be/abc', description: 'Intro' });
      expect(useAppStore.getState().activeCourse!.status).toBe('DRAFT');
    });

    it('updateCourse e updateCourseModule usam PATCH (contrato 7.9)', async () => {
      mockRoutes({
        [`PATCH ${T}/courses/5`]: { id: 5 },
        [`PATCH ${T}/courses/5/modules/51`]: { id: 51 },
        [`GET ${T}/courses`]: [],
        [`GET ${T}/courses/5`]: courseDetail,
      });

      expect(await useAppStore.getState().updateCourse('5', 'Novo', 'Desc')).toBe(true);
      expect(await useAppStore.getState().updateCourseModule('5', '51', 'Mod novo')).toBe(true);
      expect(api).toHaveBeenCalledWith('PATCH', `${T}/courses/5`, { title: 'Novo', description: 'Desc' });
      expect(api).toHaveBeenCalledWith('PATCH', `${T}/courses/5/modules/51`, { title: 'Mod novo' });
    });

    it('updateCourse com erro não muda o título local nem mostra sucesso', async () => {
      mockRoutes({ [`PATCH ${T}/courses/5`]: new Error('Rota ainda não disponível.') });

      expect(await useAppStore.getState().updateCourse('5', 'Novo', 'Desc')).toBe(false);
      expect(useAppStore.getState().activeCourse!.title).toBe('Curso SQL');
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Rota ainda não disponível.');
    });

    it('updateCourseLesson com erro mantém a aula como estava', async () => {
      mockRoutes({ [`PATCH ${T}/courses/5/modules/51/lessons/61`]: new Error('Link inválido.') });

      expect(await useAppStore.getState().updateCourseLesson('5', '51', '61', { title: 'Mudou', contentUrl: 'ftp://x' })).toBe(false);
      expect(useAppStore.getState().activeCourse!.modules[0].lessons[0].title).toBe('Aula 1');
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('reorderCourseLessons envia ids numéricos, não mexe no estado se falhar e funciona com ids existentes', async () => {
      mockRoutes({ [`PUT ${T}/courses/5/modules/51/lessons/order`]: new Error('Aula de outro módulo.') });
      expect(await useAppStore.getState().reorderCourseLessons('5', '51', ['62', '61'])).toBe(false);
      expect(useAppStore.getState().activeCourse!.modules[0].lessons.map(l => l.id)).toEqual(['61', '62']);

      const swapped = {
        ...courseDetail,
        modules: [{ ...courseDetail.modules[0], lessons: [courseDetail.modules[0].lessons[1], courseDetail.modules[0].lessons[0]] }],
      };
      mockRoutes({ [`PUT ${T}/courses/5/modules/51/lessons/order`]: [], [`GET ${T}/courses/5`]: swapped });
      expect(await useAppStore.getState().reorderCourseLessons('5', '51', ['62', '61'])).toBe(true);
      expect(api).toHaveBeenCalledWith('PUT', `${T}/courses/5/modules/51/lessons/order`, { lessonIds: [62, 61] });
      expect(useAppStore.getState().activeCourse!.modules[0].lessons.map(l => l.id)).toEqual(['62', '61']);
    });

    it('reorderCourseModules chama PUT .../modules/order e falha sem alterar a ordem', async () => {
      mockRoutes({ [`PUT ${T}/courses/5/modules/order`]: new Error('Erro') });
      expect(await useAppStore.getState().reorderCourseModules('5', ['51'])).toBe(false);
      expect(api).toHaveBeenCalledWith('PUT', `${T}/courses/5/modules/order`, { moduleIds: [51] });
    });

    it('checkCoursePublication devolve a resposta do servidor no formato {type, ids, titles, message}', async () => {
      mockRoutes({
        [`GET ${T}/courses/5/publication-check`]: {
          publishable: false,
          problems: [{ type: 'LESSON_WITHOUT_MATERIAL', ids: [62], titles: ['Aula 2'], message: 'A aula "Aula 2" não tem material.' }],
        },
      });
      const result = await useAppStore.getState().checkCoursePublication('5');
      expect(result).toEqual({
        publishable: false,
        problems: [{ type: 'LESSON_WITHOUT_MATERIAL', ids: [62], titles: ['Aula 2'], message: 'A aula "Aula 2" não tem material.' }],
      });
    });

    it('checkCoursePublication com erro devolve null e não faz verificação local', async () => {
      mockRoutes({ [`GET ${T}/courses/5/publication-check`]: new Error('Rota não encontrada.') });
      expect(await useAppStore.getState().checkCoursePublication('5')).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('Rota não encontrada.');
    });

    it('publishCourse e unpublishCourse só mudam o estado quando o servidor aceita', async () => {
      mockRoutes({ [`POST ${T}/courses/5/publish`]: new Error('Não é possível publicar: 1 problema(s).') });
      expect(await useAppStore.getState().publishCourse('5')).toBe(false);
      expect(useAppStore.getState().activeCourse!.status).toBe('DRAFT');
      expect(toast.success).not.toHaveBeenCalled();

      const published = { ...courseDetail, status: 'PUBLISHED', publishedAt: '2026-11-12T10:00:00Z' };
      mockRoutes({ [`POST ${T}/courses/5/publish`]: published, [`GET ${T}/courses`]: [], [`GET ${T}/courses/5`]: published });
      expect(await useAppStore.getState().publishCourse('5')).toBe(true);
      expect(useAppStore.getState().activeCourse!.status).toBe('PUBLISHED');

      mockRoutes({ [`POST ${T}/courses/5/unpublish`]: new Error('Erro') });
      expect(await useAppStore.getState().unpublishCourse('5')).toBe(false);
      expect(useAppStore.getState().activeCourse!.status).toBe('PUBLISHED');
    });

    it('exportCourseCsv baixa de GET .../export?format=csv; com erro mostra a mensagem', async () => {
      download.mockResolvedValueOnce(undefined);
      expect(await useAppStore.getState().exportCourseCsv('5')).toBe(true);
      expect(download).toHaveBeenCalledWith(`${T}/courses/5/export?format=csv`, 'curso-5.csv');

      download.mockRejectedValueOnce(new Error('Exportação indisponível.'));
      expect(await useAppStore.getState().exportCourseCsv('5')).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Exportação indisponível.');
    });
  });

  describe('Materiais, resumo, revisão, alertas e convites (sem sucesso falso)', () => {
    it('uploadMaterial com falha no servidor não inventa material local', async () => {
      mockRoutes({ [`POST ${T}/cards/100/materials`]: new Error('Arquivo maior que 20 MB.') });
      const file = new File(['pdf'], 'apostila.pdf', { type: 'application/pdf' });

      expect(await useAppStore.getState().uploadMaterial('100', file)).toBeNull();
      expect(useAppStore.getState().cardMaterials['100']).toBeUndefined();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Arquivo maior que 20 MB.');
    });

    it('uploadMaterial com sucesso guarda o material devolvido pelo servidor', async () => {
      mockRoutes({
        [`POST ${T}/cards/100/materials`]: {
          id: 77, cardId: 100, fileName: 'apostila.pdf', contentType: 'application/pdf', sizeBytes: 11,
          uploadedBy: { userId: 4, name: 'Ana Souza' }, createdAt: '2026-11-12T10:00:00Z',
        },
      });
      const file = new File(['pdf content'], 'apostila.pdf', { type: 'application/pdf' });

      const result = await useAppStore.getState().uploadMaterial('100', file);

      expect(result).toMatchObject({ id: '77', fileName: 'apostila.pdf' });
      expect(useAppStore.getState().cardMaterials['100']).toHaveLength(1);
    });

    it('uploadMaterial rejeita extensão não permitida e arquivo acima de 20 MB sem chamar a API', async () => {
      const exe = new File(['x'], 'script.exe');
      const big = new File([new ArrayBuffer(21 * 1024 * 1024)], 'grande.pdf');
      expect(await useAppStore.getState().uploadMaterial('100', exe)).toBeNull();
      expect(await useAppStore.getState().uploadMaterial('100', big)).toBeNull();
      expect(api).not.toHaveBeenCalled();
    });

    it('deleteMaterial só remove da lista depois do sucesso', async () => {
      useAppStore.setState({ cardMaterials: { '100': [{ id: '77', cardId: '100', fileName: 'a.pdf', contentType: 'application/pdf', sizeBytes: 1, createdAt: 'x' }] } });
      mockRoutes({ [`DELETE ${T}/materials/77`]: new Error('Material não encontrado.') });
      expect(await useAppStore.getState().deleteMaterial('77', '100')).toBe(false);
      expect(useAppStore.getState().cardMaterials['100']).toHaveLength(1);

      mockRoutes({ [`DELETE ${T}/materials/77`]: null });
      expect(await useAppStore.getState().deleteMaterial('77', '100')).toBe(true);
      expect(useAppStore.getState().cardMaterials['100']).toHaveLength(0);
    });

    it('downloadMaterial usa fetch + blob com token (apiDownload) e mostra erro se falhar', async () => {
      const material = { id: '77', cardId: '100', fileName: 'apostila.pdf', contentType: 'application/pdf', sizeBytes: 1, createdAt: 'x' };
      download.mockResolvedValueOnce(undefined);
      expect(await useAppStore.getState().downloadMaterial(material)).toBe(true);
      expect(download).toHaveBeenCalledWith(`${T}/materials/77/download`, 'apostila.pdf');

      download.mockRejectedValueOnce(new Error('Material não encontrado.'));
      expect(await useAppStore.getState().downloadMaterial(material)).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Material não encontrado.');
    });

    it('generateCardSummary com erro (ex.: menos de 100 palavras) não cria resumo inventado', async () => {
      mockRoutes({ [`POST ${T}/cards/100/summary`]: new Error('Dados insuficientes para gerar o resumo.') });

      expect(await useAppStore.getState().generateCardSummary('100')).toBeNull();
      expect(useAppStore.getState().cardSummaries['100']).toBeUndefined();
      expect(toast.error).toHaveBeenCalledWith('Dados insuficientes para gerar o resumo.');
    });

    it('generateCardSummary e fetchCardSummary guardam o resumo do servidor; 404 no GET é silencioso', async () => {
      mockRoutes({ [`POST ${T}/cards/100/summary`]: { cardId: 100, summary: 'Resumo real', generatedAt: '2026-11-12T10:00:00Z', basedOn: 'SCRIPT' } });
      const summary = await useAppStore.getState().generateCardSummary('100');
      expect(summary?.summary).toBe('Resumo real');

      const notFound = Object.assign(new Error('Resumo não encontrado.'), { status: 404 });
      mockRoutes({ [`GET ${T}/cards/200/summary`]: notFound });
      (toast.error as jest.Mock).mockClear();
      expect(await useAppStore.getState().fetchCardSummary('200')).toBeNull();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('submitCardReview com erro não altera o card e não mostra sucesso', async () => {
      mockRoutes({ [`POST ${T}/cards/100/reviews`]: new Error('Apenas Revisor ou Administrador pode revisar.') });

      expect(await useAppStore.getState().submitCardReview('100', 'APPROVED', '')).toBe(false);
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Apenas Revisor ou Administrador pode revisar.');
    });

    it('fetchAlerts com erro não avisa na tela e não calcula alertas no cliente', async () => {
      useAppStore.setState({
        board: { teamId: '7', teamName: 'X', columns: [{ id: '10', name: 'A', sortOrder: 0, cards: [{
          id: '1', title: 'Atrasado', description: '', type: 'PROJECT', sortOrder: 0, progress: 0, tasksTotal: 0, tasksDone: 0, dueDate: '2020-01-01', createdAt: 'x',
        }] }] },
      });
      mockRoutes({ [`GET ${T}/alerts`]: new Error('Rota não encontrada.') });

      await useAppStore.getState().fetchAlerts();

      expect(useAppStore.getState().alerts).toEqual([]);
      // Carga em segundo plano: não mostra aviso na tela
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('fetchAlerts mapeia a resposta do servidor', async () => {
      mockRoutes({ [`GET ${T}/alerts`]: [{ type: 'TASK_DUE_SOON', cardId: 100, cardTitle: 'Videoaula', taskId: 502, taskTitle: 'Editar', dueDate: '2026-11-14', daysLeft: 2 }] });
      await useAppStore.getState().fetchAlerts();
      expect(useAppStore.getState().alerts[0]).toEqual({ type: 'TASK_DUE_SOON', cardId: '100', cardTitle: 'Videoaula', taskId: '502', taskTitle: 'Editar', dueDate: '2026-11-14', daysLeft: 2 });
    });

    it('createTeamInvite com erro não cria convite local', async () => {
      mockRoutes({ [`POST ${T}/invites`]: new Error('Rota não encontrada.') });

      expect(await useAppStore.getState().createTeamInvite('novo@exemplo.com', 'CREATOR')).toBe(false);
      expect(useAppStore.getState().teamInvites).toEqual([]);
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('cancelTeamInvite com erro mantém o convite na lista', async () => {
      useAppStore.setState({ teamInvites: [{ id: '1', email: 'a@b.com', role: 'CREATOR', status: 'PENDING', createdAt: 'x', expiresAt: 'y' }] });
      mockRoutes({ [`DELETE ${T}/invites/1`]: new Error('Convite não encontrado.') });

      expect(await useAppStore.getState().cancelTeamInvite('1')).toBe(false);
      expect(useAppStore.getState().teamInvites).toHaveLength(1);
    });

    it('renameTeam e deleteTeam não mudam o estado quando o servidor recusa', async () => {
      useAppStore.setState({ teams: [{ id: '7', name: 'Estúdio Alfa', role: 'ADMIN', membersCount: 1, createdAt: 'x' }], activeTeam: { id: '7', name: 'Estúdio Alfa', role: 'ADMIN', membersCount: 1, createdAt: 'x' } });
      mockRoutes({ 'PATCH /api/v1/teams/7': new Error('Rota não encontrada.'), 'DELETE /api/v1/teams/7': new Error('Rota não encontrada.') });

      expect(await useAppStore.getState().renameTeam('Novo nome')).toBe(false);
      expect(useAppStore.getState().teams[0].name).toBe('Estúdio Alfa');
      expect(await useAppStore.getState().deleteTeam('7')).toBe(false);
      expect(useAppStore.getState().teams).toHaveLength(1);
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('Cargas em segundo plano não geram aviso na tela', () => {
    let errSpy: jest.SpyInstance;
    beforeEach(() => {
      errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => errSpy.mockRestore());

    it('fetchTeamInvites, fetchTeamTags, fetchTeamMembers e fetchCourses só registram no console', async () => {
      mockRoutes({
        [`GET ${T}/invites`]: new Error('Rota não encontrada.'),
        [`GET ${T}/tags`]: new Error('Falha.'),
        [`GET ${T}/members`]: new Error('Falha.'),
        [`GET ${T}/courses`]: new Error('Falha.'),
      });

      await useAppStore.getState().fetchTeamInvites();
      await useAppStore.getState().fetchTeamTags();
      await useAppStore.getState().fetchTeamMembers();
      await useAppStore.getState().fetchCourses();

      expect(toast.error).not.toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalledTimes(4);
      expect(useAppStore.getState().teamInvites).toEqual([]);
      expect(useAppStore.getState().teamTags).toEqual([]);
      expect(useAppStore.getState().teamMembers).toEqual([]);
      expect(useAppStore.getState().courses).toEqual([]);
    });

    it('fetchTeams: falha nas cargas secundárias não gera aviso (só o quadro/equipes principais)', async () => {
      mockRoutes({
        'GET /api/v1/teams': [{ id: 7, name: 'Estúdio', role: 'ADMIN', membersCount: 1, createdAt: 'x' }],
        [`GET ${T}/board`]: boardResponse,
        [`GET ${T}/ideas?sort=recent`]: [],
        [`GET ${T}/courses`]: new Error('Falha.'),
        [`GET ${T}/tags`]: new Error('Falha.'),
        [`GET ${T}/members`]: new Error('Falha.'),
      });

      await useAppStore.getState().fetchTeams();

      expect(toast.error).not.toHaveBeenCalled();
      expect(useAppStore.getState().board?.teamName).toBe('Estúdio Alfa');
    });
  });

  describe('Estúdio de roteiro', () => {
    it('exportScript usa GET /kanban/{id}/script/export e mapeia a resposta', async () => {
      mockRoutes({
        'GET /api/v1/kanban/100/script/export': {
          cardId: 100, cardTitle: 'Videoaula', targetAudience: 'Iniciantes', pedagogicalObjective: 'Joins',
          rawContent: 'texto', markdownFormatted: '# Roteiro', wordCount: 1, estimatedMinutes: 1,
        },
      });
      const data = await useAppStore.getState().exportScript('100');
      expect(data).toMatchObject({ cardId: '100', markdownFormatted: '# Roteiro', estimatedMinutes: 1 });
    });

    it('exportScript com erro devolve null e mostra a mensagem do servidor', async () => {
      mockRoutes({ 'GET /api/v1/kanban/100/script/export': new Error('Projeto não encontrado.') });
      expect(await useAppStore.getState().exportScript('100')).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('Projeto não encontrado.');
    });

    it('BF-18: fetchScriptVersions aceita lista vazia', async () => {
      mockRoutes({ 'GET /api/v1/kanban/100/script/versions': [] });
      expect(await useAppStore.getState().fetchScriptVersions('100')).toEqual([]);
      expect(toast.error).not.toHaveBeenCalled();
    });
  });
});
