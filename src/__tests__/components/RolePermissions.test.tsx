import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useAppStore, Team, ProjectCard, BoardColumn } from '@/store/useAppStore';
import { KanbanBoard } from '@/components/shared/KanbanBoard';
import { IdeasInbox } from '@/components/shared/IdeasInbox';
import { Navbar } from '@/components/shared/Navbar';
import { CardTaskDialog } from '@/components/shared/CardTaskDialog';
import { CoursesView } from '@/components/shared/CoursesView';
import { ScriptEditor } from '@/components/shared/ScriptEditor';

const mockApiCard = {
  id: 1,
  title: 'Projeto Piloto',
  description: 'Descrição do projeto piloto',
  votes: 3,
  votedByMe: false,
  tag: 'Tutorial',
  targetAudience: 'Iniciantes',
  pedagogicalObjective: 'Introduzir o tema',
  createdAt: '2026-11-01T10:00:00Z',
};

jest.mock('@/lib/api', () => ({
  apiRequest: jest.fn().mockImplementation((method, path) => {
    if (path.includes('/ideas')) {
      return Promise.resolve([mockApiCard]);
    }
    if (path.includes('/script/versions')) {
      return Promise.resolve([]);
    }
    if (path.includes('/script')) {
      return Promise.resolve({ id: 1, content: '<p>Conteúdo do roteiro</p>' });
    }
    return Promise.resolve([]);
  }),
  getCookie: jest.fn().mockReturnValue('mock-token'),
  deleteCookie: jest.fn(),
}));

jest.mock('@/components/shared/ThemeColorPicker', () => ({
  ThemeColorPicker: () => <div data-testid="theme-color-picker">ColorPicker</div>,
}));

jest.mock('@/components/shared/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));

jest.mock('@/components/shared/TeamSwitcher', () => ({
  TeamSwitcher: () => <div data-testid="team-switcher">TeamSwitcher</div>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

jest.mock('@tiptap/react', () => ({
  useEditor: () => ({
    getHTML: () => '<p>Conteúdo do roteiro</p>',
    getText: () => 'Conteúdo do roteiro',
    commands: { setContent: jest.fn() },
    chain: () => ({
      focus: () => ({
        toggleBold: () => ({ run: jest.fn() }),
        toggleItalic: () => ({ run: jest.fn() }),
        toggleHeading: () => ({ run: jest.fn() }),
        toggleBulletList: () => ({ run: jest.fn() }),
        toggleOrderedList: () => ({ run: jest.fn() }),
      }),
    }),
    isActive: jest.fn().mockReturnValue(false),
    setEditable: jest.fn(),
  }),
  EditorContent: () => <div data-testid="tiptap-mock">Mock Editor</div>,
}));

describe('TF-09 / BF-07 - Matriz de Permissões por Papel (ADMIN, CREATOR, REVIEWER)', () => {
  const mockCard: ProjectCard = {
    id: '1',
    title: 'Projeto Piloto',
    description: 'Descrição do projeto piloto',
    columnId: 'col-1',
    columnSince: new Date().toISOString(),
    sortOrder: 0,
    progress: 50,
    tasksTotal: 2,
    tasksDone: 1,
    targetAudience: 'Iniciantes',
    pedagogicalObjective: 'Introduzir o tema',
    tag: 'Tutorial',
    dueDate: '2026-11-20',
    votes: 3,
    votedByMe: false,
    tasks: [
      { id: 1, cardId: 1, title: 'Gravar intro', completed: true, sortOrder: 0, createdAt: new Date().toISOString() },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockColumns: BoardColumn[] = [
    { id: 'col-1', name: 'Pesquisa', sortOrder: 0, cards: [mockCard] },
    { id: 'col-2', name: 'Roteiro', sortOrder: 1, cards: [] },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Papel: REVIEWER (Somente Leitura na Produção)', () => {
    beforeEach(() => {
      const reviewerTeam: Team = {
        id: '10',
        name: 'Estúdio de Ana',
        role: 'REVIEWER',
        membersCount: 3,
        createdAt: new Date().toISOString(),
      };

      useAppStore.setState({
        activeTeam: reviewerTeam,
        activeTeamId: '10',
        board: { teamId: 10, columns: mockColumns },
        ideas: [mockCard],
        courses: [],
        activeCourse: null,
      });
    });

    it('Quadro: Revisor não vê botão de adicionar coluna nem botões de edição/exclusão/setas de cards', async () => {
      await act(async () => {
        render(<KanbanBoard />);
      });

      expect(screen.queryByRole('button', { name: /adicionar coluna/i })).not.toBeInTheDocument();
      expect(screen.queryByTitle(/excluir item/i)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/mover para próxima coluna/i)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/mover para coluna anterior/i)).not.toBeInTheDocument();
      expect(screen.getByText('Projeto Piloto')).toBeInTheDocument();
    });

    it('Caixa de Entrada: Revisor não vê botões de criar nova ideia, converter ou excluir, mas vê votos', async () => {
      await act(async () => {
        render(<IdeasInbox />);
      });

      expect(screen.queryByRole('button', { name: /nova ideia/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /converter em projeto/i })).not.toBeInTheDocument();
      expect(screen.queryByTitle(/excluir ideia/i)).not.toBeInTheDocument();
      expect(screen.getByTitle(/votar nesta ideia/i)).toBeInTheDocument();
    });

    it('Navbar: Revisor não vê botão de capturar ideia na barra de navegação', async () => {
      await act(async () => {
        render(<Navbar />);
      });

      expect(screen.queryByRole('button', { name: /capturar ideia/i })).not.toBeInTheDocument();
    });

    it('Tarefas: Revisor não vê formulário para adicionar tarefas no card', async () => {
      await act(async () => {
        render(<CardTaskDialog card={mockCard} open={true} onOpenChange={() => {}} />);
      });

      expect(screen.queryByRole('button', { name: /adicionar/i })).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/gravar áudio da intro/i)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/excluir tarefa/i)).not.toBeInTheDocument();
    });

    it('Cursos: Revisor não vê botão de criar curso nem adicionar módulo', async () => {
      await act(async () => {
        render(<CoursesView />);
      });

      expect(screen.queryByRole('button', { name: /criar novo curso/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /adicionar módulo/i })).not.toBeInTheDocument();
    });

    it('Roteiro: Revisor não vê botão Salvar nem Snapshot no Estúdio de Escrita', () => {
      render(<ScriptEditor kanbanItemId="1" />);

      expect(screen.queryByRole('button', { name: /^salvar$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^snapshot$/i })).not.toBeInTheDocument();
      expect(screen.getByText(/modo leitura/i)).toBeInTheDocument();
    });
  });

  describe('Papel: CREATOR (Criador)', () => {
    beforeEach(() => {
      const creatorTeam: Team = {
        id: '10',
        name: 'Estúdio de Ana',
        role: 'CREATOR',
        membersCount: 3,
        createdAt: new Date().toISOString(),
      };

      useAppStore.setState({
        activeTeam: creatorTeam,
        activeTeamId: '10',
        board: { teamId: 10, columns: mockColumns },
        ideas: [mockCard],
        courses: [],
        activeCourse: null,
      });
    });

    it('Quadro: Criador NÃO pode adicionar ou configurar colunas, mas PODE mover e editar cards', async () => {
      await act(async () => {
        render(<KanbanBoard />);
      });

      expect(screen.queryByRole('button', { name: /adicionar coluna/i })).not.toBeInTheDocument();
      expect(screen.queryByTitle(/configurar coluna/i)).not.toBeInTheDocument();
      expect(screen.getByTitle(/mover para próxima coluna/i)).toBeInTheDocument();
      expect(screen.getByTitle(/excluir item/i)).toBeInTheDocument();
    });

    it('Caixa de Entrada: Criador pode criar novas ideias e convertê-las em projetos', async () => {
      await act(async () => {
        render(<IdeasInbox />);
      });

      expect(screen.getByRole('button', { name: /nova ideia/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /converter em projeto/i })).toBeInTheDocument();
    });

    it('Navbar: Criador pode ver botão de capturar ideia', async () => {
      await act(async () => {
        render(<Navbar />);
      });

      expect(screen.getByRole('button', { name: /capturar ideia/i })).toBeInTheDocument();
    });
  });

  describe('Papel: ADMIN (Administrador)', () => {
    beforeEach(() => {
      const adminTeam: Team = {
        id: '10',
        name: 'Estúdio de Ana',
        role: 'ADMIN',
        membersCount: 3,
        createdAt: new Date().toISOString(),
      };

      useAppStore.setState({
        activeTeam: adminTeam,
        activeTeamId: '10',
        board: { teamId: 10, columns: mockColumns },
        ideas: [mockCard],
        courses: [],
        activeCourse: null,
      });
    });

    it('Quadro: Administrador pode adicionar coluna e configurar colunas', async () => {
      await act(async () => {
        render(<KanbanBoard />);
      });

      expect(screen.getByRole('button', { name: /adicionar coluna/i })).toBeInTheDocument();
      expect(screen.getAllByTitle(/configurar coluna/i).length).toBeGreaterThan(0);
      expect(screen.getByTitle(/mover para próxima coluna/i)).toBeInTheDocument();
    });
  });
});
