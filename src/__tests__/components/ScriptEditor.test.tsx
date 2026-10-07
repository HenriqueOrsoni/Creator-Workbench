import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScriptEditor } from '@/components/shared/ScriptEditor';
import * as apiModule from '@/lib/api';

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
    window.alert = jest.fn();
    window.confirm = jest.fn().mockReturnValue(true);
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

    const snapshotButton = screen.getByRole('button', { name: /^snapshot$/i });
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
});
