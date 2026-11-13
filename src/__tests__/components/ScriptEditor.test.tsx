import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScriptEditor } from '@/components/shared/ScriptEditor';
import * as apiModule from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockToggleBold = jest.fn().mockReturnThis();
const mockToggleItalic = jest.fn().mockReturnThis();
const mockSetContent = jest.fn();
const mockGetHTML = jest.fn().mockReturnValue('<p>Conteúdo do Roteiro</p>');

jest.mock('@tiptap/react', () => ({
  useEditor: () => ({
    chain: () => ({
      focus: () => ({
        toggleBold: () => ({ run: mockToggleBold }),
        toggleItalic: () => ({ run: mockToggleItalic }),
        toggleHeading: () => ({ run: jest.fn() }),
        toggleBulletList: () => ({ run: jest.fn() }),
        toggleOrderedList: () => ({ run: jest.fn() }),
      }),
    }),
    isActive: jest.fn().mockReturnValue(false),
    commands: {
      setContent: mockSetContent,
    },
    getHTML: mockGetHTML,
    getText: jest.fn().mockReturnValue('Conteúdo do Roteiro de Teste'),
  }),
  EditorContent: () => <div data-testid="editor-content">Conteúdo TipTap</div>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

jest.mock('@/lib/api', () => ({
  apiRequest: jest.fn(),
}));

describe('4.4 Componentes do Editor de Roteiros (FT-18 a FT-21)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState({ activeTeam: { id: 't1', name: 'Equipe', role: 'ADMIN', membersCount: 1, createdAt: 'x' } });
    window.alert = jest.fn();
    window.confirm = jest.fn().mockReturnValue(true);
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    (apiModule.apiRequest as jest.Mock).mockResolvedValue([]);
  });

  // FT-18: Editor TipTap renderiza com conteúdo
  it('FT-18: Renderiza o editor de roteiro e busca o conteúdo do backend', async () => {
    (apiModule.apiRequest as jest.Mock).mockImplementation((method, path) => {
      if (path.includes('/script/versions')) return Promise.resolve([]);
      if (path.includes('/script')) return Promise.resolve({ content: '<p>Roteiro Aula 1</p>' });
      return Promise.resolve(null);
    });

    render(<ScriptEditor kanbanItemId="1" />);

    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    await waitFor(() => {
      expect(apiModule.apiRequest).toHaveBeenCalledWith('GET', '/api/v1/kanban/1/script');
    });
  });

  // FT-19: Toolbar aplica formatação (negrito, itálico)
  it('FT-19: Botões da toolbar disparam comandos de formatação do editor', async () => {
    render(<ScriptEditor kanbanItemId="1" />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    fireEvent.click(buttons[0]);
    expect(mockToggleBold).toHaveBeenCalled();

    await waitFor(() => {
      expect(apiModule.apiRequest).toHaveBeenCalled();
    });
  });

  // FT-20: Botão de snapshot cria versão
  it('FT-20: Dispara criação de snapshot de versão via chamada POST para o backend', async () => {
    (apiModule.apiRequest as jest.Mock).mockResolvedValue({ success: true });

    render(<ScriptEditor kanbanItemId="1" />);

    const snapshotButton = screen.getByRole('button', { name: /^versão$/i });
    expect(snapshotButton).toBeInTheDocument();

    fireEvent.click(snapshotButton);

    await waitFor(() => {
      expect(apiModule.apiRequest).toHaveBeenCalledWith(
        'POST',
        '/api/v1/kanban/1/script/versions'
      );
    });
  });

  // FT-21: Lista de versões exibe histórico
  it('FT-21: Busca histórico de versões anteriores do roteiro ao inicializar', async () => {
    const mockVersions = [
      { id: 1, createdAt: '2026-06-01T10:00:00Z', content: '<p>Versão 1</p>' },
      { id: 2, createdAt: '2026-06-01T11:00:00Z', content: '<p>Versão 2</p>' },
    ];

    (apiModule.apiRequest as jest.Mock).mockImplementation((method, path) => {
      if (path.includes('/script/versions')) return Promise.resolve(mockVersions);
      return Promise.resolve({ content: '' });
    });

    render(<ScriptEditor kanbanItemId="1" />);

    await waitFor(() => {
      expect(screen.getByText(/revisões \(2\)/i)).toBeInTheDocument();
    });
  });

  // Fase 3: Exportação e Métricas
  it('Fase 3: Renderiza botões de exportação e estimativa de locução', async () => {
    render(<ScriptEditor kanbanItemId="1" />);

    expect(screen.getByRole('button', { name: /exportar \.md/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /imprimir/i })).toBeInTheDocument();
    expect(screen.getByText(/palavras • ~1 min de locução/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(apiModule.apiRequest).toHaveBeenCalled();
    });
  });

  // Exportação: o Markdown vem do servidor (GET .../script/export)
  it('exporta o Markdown devolvido pelo servidor', async () => {
    const mockExportScript = jest.fn().mockResolvedValue({
      cardId: '1',
      cardTitle: 'Videoaula SQL',
      targetAudience: 'Iniciantes',
      pedagogicalObjective: 'Joins',
      rawContent: 'texto',
      markdownFormatted: '# Roteiro do servidor',
      wordCount: 1,
      estimatedMinutes: 1,
    });
    useAppStore.setState({ exportScript: mockExportScript });

    window.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = jest.fn();

    render(<ScriptEditor kanbanItemId="1" />);

    fireEvent.click(screen.getByRole('button', { name: /exportar \.md/i }));

    await waitFor(() => {
      expect(mockExportScript).toHaveBeenCalledWith('1');
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });
    const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    expect(text).toBe('# Roteiro do servidor');
  });

  it('se a exportação falhar, nada é gerado no cliente (sem Markdown inventado)', async () => {
    const mockExportScript = jest.fn().mockResolvedValue(null);
    useAppStore.setState({ exportScript: mockExportScript });

    window.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');

    render(<ScriptEditor kanbanItemId="1" />);

    fireEvent.click(screen.getByRole('button', { name: /exportar \.md/i }));

    await waitFor(() => expect(mockExportScript).toHaveBeenCalledWith('1'));
    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
  });

  // BF-14: o nome do projeto selecionado aparece no estúdio
  it('BF-14: mostra o nome do projeto selecionado', () => {
    useAppStore.setState({
      items: [
        { id: '1', title: 'Videoaula de SQL', description: '', createdAt: 0, progress: 0 },
        { id: '2', title: 'Podcast de Grafos', description: '', createdAt: 0, progress: 0 },
      ],
    });
    render(<ScriptEditor kanbanItemId="2" />);

    expect(screen.getByText('Podcast de Grafos', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByText('Projeto de Produção')).not.toBeInTheDocument();
  });

  // BF-18: roteiro vazio e lista de versões vazia são respostas normais (200)
  it('BF-18: roteiro sem conteúdo e versões vazias carregam sem erro', async () => {
    (apiModule.apiRequest as jest.Mock).mockImplementation((method, path) => {
      if (path.endsWith('/script/versions')) return Promise.resolve([]);
      if (path.endsWith('/script')) return Promise.resolve({ id: null, kanbanItemId: 1, content: '', createdAt: null, updatedAt: null });
      return Promise.resolve(null);
    });

    render(<ScriptEditor kanbanItemId="1" />);

    await waitFor(() => expect(mockSetContent).toHaveBeenCalledWith(''));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('erro ao carregar o roteiro mostra a mensagem do servidor', async () => {
    (apiModule.apiRequest as jest.Mock).mockImplementation((method, path) => {
      if (path.endsWith('/script/versions')) return Promise.resolve([]);
      return Promise.reject(new Error('Projeto não encontrado.'));
    });

    render(<ScriptEditor kanbanItemId="1" />);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Projeto não encontrado.'));
  });

  it('plano sem resumo automático: botão Resumo IA desabilitado com a dica de plano', async () => {
    const { mapTeamPlan } = await import('@/lib/plans');
    useAppStore.setState({
      teamPlan: mapTeamPlan({
        teamId: 1, plan: 'SOLO', planName: 'Solo', source: 'MANUAL', expiresAt: null, trialAvailable: false,
        limits: { maxUsers: 1, maxActiveProjects: 10, maxCourses: 5, automaticSummary: false, storageBytes: 1 },
        usage: { members: 1, activeProjects: 0, courses: 0, storageBytes: 0 }, overLimit: false,
      }),
    });
    render(<ScriptEditor kanbanItemId="1" />);
    const gate = await screen.findByTestId('summary-plan-gate');
    expect(gate).toBeDisabled();
    expect(gate).toHaveAttribute('title', 'Disponível nos planos Pro e Agência');
    useAppStore.setState({ teamPlan: null });
  });
});
