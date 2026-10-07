import { useAppStore } from '@/store/useAppStore';
import * as apiModule from '@/lib/api';

jest.mock('@/lib/api', () => ({
  apiRequest: jest.fn(),
  getCookie: jest.fn(),
  setCookie: jest.fn(),
  deleteCookie: jest.fn(),
}));

describe('4.1 Store Zustand (FT-01 a FT-06)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState({
      items: [],
      selectedProjectId: null,
    });
  });

  // FT-01: fetchItems popula a lista de itens do Kanban
  it('FT-01: fetchItems popula a lista de itens do Kanban a partir da API', async () => {
    const mockBackendItems = [
      {
        id: 1,
        title: 'Vídeo sobre Next.js',
        description: 'Explicar arquitetura',
        state: 'IDEATION',
        createdAt: '2026-05-31T18:30:00Z',
        progress: 0,
      },
      {
        id: 2,
        title: 'Curso de Java',
        description: 'Fundamentos',
        state: 'IN_PRODUCTION',
        createdAt: '2026-05-30T10:00:00Z',
        progress: 45,
        targetAudience: 'Iniciantes',
        pedagogicalObjective: 'Aprender sintaxe e POO',
      },
    ];

    (apiModule.apiRequest as jest.Mock).mockResolvedValueOnce(mockBackendItems);

    await useAppStore.getState().fetchItems();

    expect(apiModule.apiRequest).toHaveBeenCalledWith('GET', '/api/v1/kanban');
    const items = useAppStore.getState().items;
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Vídeo sobre Next.js');
    expect(items[0].state).toBe('IDEATION');
    expect(items[1].state).toBe('IN_PRODUCTION');
    // Deve auto-selecionar o primeiro projeto ativo
    expect(useAppStore.getState().selectedProjectId).toBe('2');
  });

  // FT-02: createItem / addIdea adiciona item e atualiza lista
  it('FT-02: addIdea cria novo item via POST e atualiza o estado local', async () => {
    const createdBackendItem = {
      id: 3,
      title: 'Ideia Nova',
      description: 'Descrição da ideia',
      state: 'IDEATION',
      createdAt: '2026-06-01T12:00:00Z',
      progress: 0,
    };

    (apiModule.apiRequest as jest.Mock).mockResolvedValueOnce(createdBackendItem);

    await useAppStore.getState().addIdea('Ideia Nova', 'Descrição da ideia');

    expect(apiModule.apiRequest).toHaveBeenCalledWith('POST', '/api/v1/kanban', {
      title: 'Ideia Nova',
      description: 'Descrição da ideia',
    });

    const items = useAppStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('3');
    expect(items[0].title).toBe('Ideia Nova');
    expect(items[0].state).toBe('IDEATION');
  });

  // FT-03: updateState altera estado do item
  it('FT-03: updateState altera estado do item e dispara atualização na API', async () => {
    useAppStore.setState({
      items: [
        {
          id: '1',
          title: 'Curso Spring Boot',
          description: 'Aulas práticas',
          state: 'IN_PRODUCTION',
          createdAt: Date.now(),
          progress: 30,
        },
      ],
    });

    (apiModule.apiRequest as jest.Mock).mockResolvedValueOnce({
      id: 1,
      title: 'Curso Spring Boot',
      state: 'REVIEW',
      progress: 30,
      createdAt: new Date().toISOString(),
    });

    await useAppStore.getState().updateState('1', 'REVIEW');

    expect(apiModule.apiRequest).toHaveBeenCalledWith('PUT', '/api/v1/kanban/1', { state: 'REVIEW' });
    expect(useAppStore.getState().items[0].state).toBe('REVIEW');
  });

  // FT-04: deleteItem remove do state e chama API
  it('FT-04: deleteItem remove o item do state local e executa chamada DELETE', async () => {
    useAppStore.setState({
      items: [
        {
          id: '1',
          title: 'Item para deletar',
          description: '',
          state: 'IDEATION',
          createdAt: Date.now(),
          progress: 0,
        },
        {
          id: '2',
          title: 'Item para manter',
          description: '',
          state: 'IN_PRODUCTION',
          createdAt: Date.now(),
          progress: 50,
        },
      ],
      selectedProjectId: '1',
    });

    (apiModule.apiRequest as jest.Mock).mockResolvedValueOnce(null);

    await useAppStore.getState().deleteItem('1');

    expect(apiModule.apiRequest).toHaveBeenCalledWith('DELETE', '/api/v1/kanban/1');
    const items = useAppStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('2');
    expect(useAppStore.getState().selectedProjectId).toBeNull();
  });

  // FT-05: setSelectedProjectId atualiza projeto ativo
  it('FT-05: setSelectedProjectId atualiza o id do projeto selecionado no estado', () => {
    expect(useAppStore.getState().selectedProjectId).toBeNull();

    useAppStore.getState().setSelectedProjectId('42');

    expect(useAppStore.getState().selectedProjectId).toBe('42');
  });

  // FT-06: Erro na API é tratado sem corromper o estado
  it('FT-06: Erro na API durante fetchItems não corrompe o estado e é tratado', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (apiModule.apiRequest as jest.Mock).mockRejectedValueOnce(new Error('Network error 500'));

    await useAppStore.getState().fetchItems();

    expect(consoleSpy).toHaveBeenCalled();
    expect(useAppStore.getState().items).toEqual([]);
    consoleSpy.mockRestore();
  });
});
