import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { FEATURES } from '@/lib/features';
import { CardTaskDialog } from '@/components/shared/CardTaskDialog';
import { TeamMembersDialog } from '@/components/shared/TeamMembersDialog';
import { UserSettingsDialog } from '@/components/shared/UserSettingsDialog';
import { Navbar } from '@/components/shared/Navbar';
import { useAppStore, ProjectCard } from '@/store/useAppStore';
import * as apiModule from '@/lib/api';

// Aqui as flags ficam como estão no código: todas as telas dos marcos 2, 3 e 4 têm backend e estão ligadas.

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiRequest: jest.fn(),
  getCookie: jest.fn(),
  deleteCookie: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => 'token-x' }),
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/components/shared/ThemeToggle', () => ({ ThemeToggle: () => null }));
jest.mock('@/components/shared/CreateIdeaDialog', () => ({
  CreateIdeaDialog: ({ trigger }: { trigger: React.ReactNode }) => <div>{trigger}</div>,
}));
jest.mock('@/components/shared/TeamSwitcher', () => ({ TeamSwitcher: () => null }));

const api = apiModule.apiRequest as jest.Mock;

const admin = { id: '10', name: 'Equipe', role: 'ADMIN' as const, membersCount: 1, createdAt: 'x' };

describe('Feature flags: telas sem backend ficam escondidas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.mockResolvedValue([]);
    (apiModule.getCookie as jest.Mock).mockReturnValue('123');
    useAppStore.setState({ activeTeam: admin, activeTeamId: '10' });
  });

  it('todas as telas com backend pronto (M2, M3, M4 e planos do M5) estão ligadas', () => {
    const on = ['materials', 'summary', 'review', 'courseEdit', 'coursePublish', 'courseCsv', 'invites', 'teamManage', 'accountSecurity', 'alerts', 'plans'];
    on.forEach((k) => expect(FEATURES[k as keyof typeof FEATURES]).toBe(true));
    expect(Object.values(FEATURES).every((v) => v === true)).toBe(true);
  });

  it('CardTaskDialog mostra as abas Materiais, Resumo IA e Revisão (sem buscar nada até abrir a aba)', () => {
    const card: ProjectCard = {
      id: '10', title: 'Projeto', description: '', type: 'PROJECT', sortOrder: 0, progress: 0,
      tasksTotal: 0, tasksDone: 0, tasks: [], createdAt: new Date().toISOString(),
    };
    render(<CardTaskDialog card={card} open={true} onOpenChange={() => {}} />);

    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Tarefas (0)', 'Materiais (0)', 'Resumo IA', 'Revisão', 'Desempenho', 'Histórico',
    ]);
    expect(api).not.toHaveBeenCalled();
  });

  it('TeamMembersDialog mostra Convites e Configurações para o Administrador', () => {
    render(<TeamMembersDialog open={true} onOpenChange={jest.fn()} />);

    expect(screen.getByRole('tab', { name: /membros/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /convites/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /configurações/i })).toBeInTheDocument();
  });

  it('UserSettingsDialog mostra as abas Perfil, Segurança e E-mail', async () => {
    api.mockResolvedValue({ id: 123, name: 'Ana', email: 'ana@example.com' });
    render(<UserSettingsDialog open={true} onOpenChange={jest.fn()} />);

    await waitFor(() => expect(screen.getByDisplayValue('Ana')).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: /segurança/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /e-mail/i })).toBeInTheDocument();
  });

  it('Navbar mostra o sino de alertas (a busca vem do carregamento do quadro, não da barra)', () => {
    render(<Navbar />);

    expect(screen.getByLabelText(/alertas de prazos/i)).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
});
