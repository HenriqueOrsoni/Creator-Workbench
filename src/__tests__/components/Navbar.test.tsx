import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Navbar } from '@/components/shared/Navbar';
import { useAppStore } from '@/store/useAppStore';


jest.mock('@/components/shared/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));

jest.mock('@/components/shared/CreateIdeaDialog', () => ({
  CreateIdeaDialog: ({ trigger }: { trigger: React.ReactNode }) => <div>{trigger}</div>,
}));

jest.mock('@/components/shared/UserSettingsDialog', () => ({
  UserSettingsDialog: ({ trigger }: { trigger: React.ReactNode }) => <div>{trigger}</div>,
}));

jest.mock('@/components/shared/TeamSwitcher', () => ({
  TeamSwitcher: () => <div data-testid="team-switcher">TeamSwitcher</div>,
}));

describe('TF-08 - Navbar Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState({ activeTeam: { id: 't1', name: 'Equipe', role: 'ADMIN', membersCount: 1, createdAt: 'x' } });
  });

  it('renderiza o título Workbench_CR e os atalhos de navegação', () => {
    render(<Navbar />);

    expect(screen.getByText(/Workbench/i)).toBeInTheDocument();
    expect(screen.getByTestId('team-switcher')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /capturar ideia/i })).toBeInTheDocument();
  });

  it('dispara onNavigate ao clicar nos botões de navegação', () => {
    const mockNavigate = jest.fn();
    render(<Navbar onNavigate={mockNavigate} />);

    const ideacaoBtn = screen.getByRole('button', { name: /^ideação$/i });
    const producaoBtn = screen.getByRole('button', { name: /^produção$/i });
    const cursosBtn = screen.getByRole('button', { name: /^cursos$/i });

    fireEvent.click(ideacaoBtn);
    expect(mockNavigate).toHaveBeenCalledWith('inbox');

    fireEvent.click(producaoBtn);
    expect(mockNavigate).toHaveBeenCalledWith('kanban');

    fireEvent.click(cursosBtn);
    expect(mockNavigate).toHaveBeenCalledWith('courses');
  });

  it('destaca a aba ativa de acordo com a propriedade activeTab', () => {
    render(<Navbar activeTab="inbox" />);
    const ideacaoBtn = screen.getByRole('button', { name: /^ideação$/i });
    expect(ideacaoBtn.className).toContain('text-foreground');
  });

  it('permite acionar o encerramento de sessão', () => {
    const mockResetStore = jest.fn();
    useAppStore.setState({ resetStore: mockResetStore });

    render(<Navbar />);
    const menuBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(menuBtn);

    const logoutBtn = screen.getByRole('button', { name: /encerrar sessão/i });
    expect(logoutBtn).toBeInTheDocument();

    fireEvent.click(logoutBtn);
    expect(mockResetStore).toHaveBeenCalled();
  });
});
