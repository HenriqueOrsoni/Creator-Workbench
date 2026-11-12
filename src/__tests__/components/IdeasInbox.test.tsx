import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { IdeasInbox } from '@/components/shared/IdeasInbox';
import { useAppStore, ProjectCard } from '@/store/useAppStore';

describe('Fase 2 - IdeasInbox Component (Caixa de Entrada)', () => {
  const mockFetchIdeas = jest.fn();
  const mockCreateInboxIdea = jest.fn();
  const mockConvertInboxIdea = jest.fn();
  const mockDeleteCard = jest.fn();
  const mockVoteIdea = jest.fn();
  const mockSetIdeaFilters = jest.fn();
  const mockFetchTeamTags = jest.fn();

  const mockIdeas: ProjectCard[] = [
    {
      id: '50',
      title: 'Ideia sobre Micro-frontend',
      description: 'Pesquisar arquitetura baseada em Module Federation',
      type: 'IDEA',
      sortOrder: 0,
      progress: 0,
      tasksTotal: 0,
      tasksDone: 0,
      votes: 2,
      votedByMe: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '51',
      title: 'Podcast sobre Grafos',
      description: '',
      type: 'IDEA',
      sortOrder: 0,
      progress: 0,
      tasksTotal: 0,
      tasksDone: 0,
      tag: 'Podcast',
      tagId: '2',
      tagColor: '#1565C0',
      votes: 0,
      votedByMe: false,
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState({
      ideas: mockIdeas,
      board: {
        teamId: '1',
        teamName: 'Equipe',
        columns: [
          { id: 'col-1', name: 'Pesquisa', sortOrder: 0, cards: [] },
          { id: 'col-2', name: 'Roteiro', sortOrder: 1, cards: [] },
        ],
      },
      activeTeam: { id: 't1', name: 'Equipe', role: 'ADMIN', membersCount: 1, createdAt: 'x' },
      fetchIdeas: mockFetchIdeas,
      createInboxIdea: mockCreateInboxIdea,
      convertInboxIdea: mockConvertInboxIdea,
      deleteCard: mockDeleteCard,
      voteIdea: mockVoteIdea,
      setIdeaFilters: mockSetIdeaFilters,
      fetchTeamTags: mockFetchTeamTags,
      ideaFilters: { q: '', tagId: '', sort: 'recent' },
      teamTags: [
        { id: '1', name: 'Tutorial', color: '#2E7D32' },
        { id: '2', name: 'Podcast', color: '#1565C0' },
      ],
    });
  });

  it('filtros de etiqueta vêm do servidor e pedem a lista filtrada (tagId)', () => {
    render(<IdeasInbox />);

    expect(screen.getByRole('button', { name: 'Todas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tutorial' })).toBeInTheDocument();

    // O primeiro "Podcast" é o botão do filtro; o selo do card é um texto simples
    fireEvent.click(screen.getByRole('button', { name: 'Podcast' }));
    expect(mockSetIdeaFilters).toHaveBeenCalledWith({ tagId: '2' });
  });

  it('não cria filtros de etiqueta fixos: sem etiquetas do servidor só existe "Todas"', () => {
    useAppStore.setState({ teamTags: [] });
    render(<IdeasInbox />);

    expect(screen.getByRole('button', { name: 'Todas' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tutorial' })).not.toBeInTheDocument();
  });

  it('busca e ordenação são enviadas ao servidor (q e sort)', () => {
    jest.useFakeTimers();
    try {
      render(<IdeasInbox />);

      fireEvent.change(screen.getByPlaceholderText('Buscar ideias...'), { target: { value: 'grafos' } });
      expect(mockSetIdeaFilters).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(400);
      });
      expect(mockSetIdeaFilters).toHaveBeenCalledWith({ q: 'grafos' });

      fireEvent.click(screen.getByRole('button', { name: /recentes/i }));
      expect(mockSetIdeaFilters).toHaveBeenCalledWith({ sort: 'votes' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('mostra a lista exatamente como o servidor devolveu (sem refiltrar no cliente)', () => {
    useAppStore.setState({ ideaFilters: { q: '', tagId: '2', sort: 'recent' }, ideas: [mockIdeas[0]] });
    render(<IdeasInbox />);

    expect(screen.getByText('Ideia sobre Micro-frontend')).toBeInTheDocument();
    expect(screen.queryByText('Podcast sobre Grafos')).not.toBeInTheDocument();
  });

  it('mostra os votos salvos e envia o voto ao servidor', () => {
    render(<IdeasInbox />);

    const voteButton = screen.getByTitle('Remover meu voto');
    expect(voteButton).toHaveTextContent('2');

    fireEvent.click(voteButton);
    expect(mockVoteIdea).toHaveBeenCalledWith('50');
  });

  it('envia o tagId escolhido ao criar a ideia', async () => {
    mockCreateInboxIdea.mockResolvedValue({ id: '60' });
    render(<IdeasInbox />);

    fireEvent.click(screen.getByRole('button', { name: /nova ideia/i }));
    fireEvent.change(screen.getByPlaceholderText('Ex: Minicurso sobre Algoritmos de Busca'), {
      target: { value: 'Artigo sobre BFS' },
    });
    fireEvent.change(screen.getByLabelText('Etiqueta'), { target: { value: '1' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /guardar na inbox/i }));
    });

    expect(mockCreateInboxIdea).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Artigo sobre BFS',
      tagId: 1,
    }));
  });

  it('Revisor não vê criar, excluir nem converter ideias, mas pode votar', () => {
    useAppStore.setState({ activeTeam: { id: 't1', name: 'Equipe', role: 'REVIEWER', membersCount: 1, createdAt: 'x' } });
    render(<IdeasInbox />);

    expect(screen.queryByRole('button', { name: /nova ideia/i })).not.toBeInTheDocument();
    expect(screen.queryByTitle('Excluir ideia')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /converter em projeto/i })).not.toBeInTheDocument();
    expect(screen.getByTitle('Remover meu voto')).toBeInTheDocument();
  });

  it('renderiza título e ideias presentes na Caixa de Entrada', () => {
    render(<IdeasInbox />);

    expect(screen.getByText('Caixa de Entrada • Inbox')).toBeInTheDocument();
    expect(screen.getByText('Ideia sobre Micro-frontend')).toBeInTheDocument();
    expect(screen.getByText('Pesquisar arquitetura baseada em Module Federation')).toBeInTheDocument();
  });

  it('exige público-alvo e objetivo pedagógico antes de converter (RN01)', async () => {
    render(<IdeasInbox />);

    fireEvent.click(screen.getAllByRole('button', { name: /converter em projeto/i })[0]);

    const confirmButton = screen.getByRole('button', { name: /confirmar e mover ao quadro/i });
    expect(confirmButton).toBeDisabled();

    await act(async () => {
      fireEvent.click(confirmButton);
    });
    expect(mockConvertInboxIdea).not.toHaveBeenCalled();
  });

  it('abre diálogo de conversão e converte a ideia com os dados da RN01', async () => {
    mockConvertInboxIdea.mockResolvedValue(true);
    render(<IdeasInbox />);

    const convertButton = screen.getAllByRole('button', { name: /converter em projeto/i })[0];
    fireEvent.click(convertButton);

    expect(screen.getByText('Ativar Projeto no Quadro')).toBeInTheDocument();
    expect(screen.getByText('Pesquisa')).toBeInTheDocument();

    fireEvent.change(screen.getAllByPlaceholderText('Ex: Iniciantes em CS').at(-1)!, {
      target: { value: 'Iniciantes' },
    });
    fireEvent.change(screen.getAllByPlaceholderText('Ex: Compreender BFS e DFS').at(-1)!, {
      target: { value: 'Entender BFS' },
    });

    const confirmButton = screen.getByRole('button', { name: /confirmar e mover ao quadro/i });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(mockConvertInboxIdea).toHaveBeenCalledWith('50', 'col-1', {
      title: 'Ideia sobre Micro-frontend',
      targetAudience: 'Iniciantes',
      pedagogicalObjective: 'Entender BFS',
    });
  });

  it('diálogo de conversão tem título preenchido e editável; título curto bloqueia e envia o título novo', async () => {
    mockConvertInboxIdea.mockResolvedValue(true);
    render(<IdeasInbox />);

    fireEvent.click(screen.getAllByRole('button', { name: /converter em projeto/i })[0]);
    const titleInput = screen.getByLabelText(/título do projeto/i) as HTMLInputElement;
    expect(titleInput.value).toBe('Ideia sobre Micro-frontend');

    fireEvent.change(screen.getAllByPlaceholderText('Ex: Iniciantes em CS').at(-1)!, { target: { value: 'Iniciantes' } });
    fireEvent.change(screen.getAllByPlaceholderText('Ex: Compreender BFS e DFS').at(-1)!, { target: { value: 'Entender BFS' } });

    fireEvent.change(titleInput, { target: { value: 'ab' } });
    expect(screen.getByText('O título deve ter pelo menos 3 caracteres.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar e mover ao quadro/i })).toBeDisabled();

    fireEvent.change(titleInput, { target: { value: 'Micro-frontend na prática' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /confirmar e mover ao quadro/i }));
    });
    expect(mockConvertInboxIdea).toHaveBeenCalledWith('50', 'col-1', expect.objectContaining({ title: 'Micro-frontend na prática' }));
  });

  it('Revisor com caixa vazia não vê "Registrar Primeira Ideia"; editor vê', () => {
    useAppStore.setState({ ideas: [], activeTeam: { id: 't1', name: 'Equipe', role: 'REVIEWER', membersCount: 1, createdAt: 'x' } });
    const { unmount } = render(<IdeasInbox />);
    expect(screen.queryByRole('button', { name: /registrar primeira ideia/i })).not.toBeInTheDocument();
    unmount();

    useAppStore.setState({ activeTeam: { id: 't1', name: 'Equipe', role: 'CREATOR', membersCount: 1, createdAt: 'x' } });
    render(<IdeasInbox />);
    expect(screen.getByRole('button', { name: /registrar primeira ideia/i })).toBeInTheDocument();
  });

  it('editor edita a ideia (título, descrição, etiqueta) e só envia a etiqueta quando mudou', async () => {
    const mockUpdateIdea = jest.fn().mockResolvedValue(true);
    useAppStore.setState({ updateIdea: mockUpdateIdea });
    render(<IdeasInbox />);

    fireEvent.click(screen.getByRole('button', { name: 'Editar ideia Ideia sobre Micro-frontend' }));
    const title = screen.getByLabelText(/título da ideia/i) as HTMLInputElement;
    expect(title.value).toBe('Ideia sobre Micro-frontend');

    fireEvent.change(title, { target: { value: 'Micro-frontend 2' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));
    });
    expect(mockUpdateIdea).toHaveBeenLastCalledWith('50', {
      title: 'Micro-frontend 2',
      description: 'Pesquisar arquitetura baseada em Module Federation',
    });

    // Troca a etiqueta de outra ideia que já tem uma, depois remove
    fireEvent.click(screen.getByRole('button', { name: 'Editar ideia Podcast sobre Grafos' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Etiqueta' }), { target: { value: '' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));
    });
    expect(mockUpdateIdea).toHaveBeenLastCalledWith('51', expect.objectContaining({ tagId: '' }));
  });

  it('edição com título curto não envia; falha do servidor mantém o diálogo aberto', async () => {
    const mockUpdateIdea = jest.fn().mockResolvedValue(false);
    useAppStore.setState({ updateIdea: mockUpdateIdea });
    render(<IdeasInbox />);

    fireEvent.click(screen.getByRole('button', { name: 'Editar ideia Ideia sobre Micro-frontend' }));
    fireEvent.change(screen.getByLabelText(/título da ideia/i), { target: { value: 'ab' } });
    expect(screen.getByRole('button', { name: /salvar alterações/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/título da ideia/i), { target: { value: 'Título válido' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));
    });
    expect(mockUpdateIdea).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Editar Ideia')).toBeInTheDocument();
  });

  it('Revisor não vê o botão de editar ideia', () => {
    useAppStore.setState({ activeTeam: { id: 't1', name: 'Equipe', role: 'REVIEWER', membersCount: 1, createdAt: 'x' } });
    render(<IdeasInbox />);
    expect(screen.queryByRole('button', { name: /editar ideia/i })).not.toBeInTheDocument();
  });
});
