import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { FEATURES } from '@/lib/features';
import { CardTaskDialog } from '@/components/shared/CardTaskDialog';
import { TeamMembersDialog } from '@/components/shared/TeamMembersDialog';
import { UserSettingsDialog } from '@/components/shared/UserSettingsDialog';
import { CoursesView } from '@/components/shared/CoursesView';
import { Navbar } from '@/components/shared/Navbar';
import { useAppStore, ProjectCard, Course, CourseDetail } from '@/store/useAppStore';
import * as apiModule from '@/lib/api';

// Aqui as flags ficam como estão no código: as telas sem backend (publicação, CSV e edição de curso)
// seguem escondidas e as rotas delas não são chamadas. Convites, equipe, segurança e alertas ligaram no marco 4.

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
jest.mock('@/components/shared/ThemeColorPicker', () => ({ ThemeColorPicker: () => null }));
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

  it('materials, summary, review (M2) e invites, teamManage, accountSecurity, alerts (M4) ligadas; as demais seguem desligadas', () => {
    const on = ['materials', 'summary', 'review', 'invites', 'teamManage', 'accountSecurity', 'alerts'];
    on.forEach((k) => expect(FEATURES[k as keyof typeof FEATURES]).toBe(true));
    const off = Object.entries(FEATURES).filter(([k]) => !on.includes(k));
    expect(off.length).toBeGreaterThan(0);
    expect(off.every(([, v]) => v === false)).toBe(true);
  });

  it('CardTaskDialog mostra as abas Materiais, Resumo IA e Revisão (sem buscar nada até abrir a aba)', () => {
    const card: ProjectCard = {
      id: '10', title: 'Projeto', description: '', type: 'PROJECT', sortOrder: 0, progress: 0,
      tasksTotal: 0, tasksDone: 0, tasks: [], createdAt: new Date().toISOString(),
    };
    render(<CardTaskDialog card={card} open={true} onOpenChange={() => {}} />);

    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Tarefas (0)', 'Materiais (0)', 'Resumo IA', 'Revisão', 'Histórico',
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

  it('CoursesView esconde publicar, despublicar e exportar CSV (mantém JSON)', () => {
    const course: Course = { id: '1', teamId: '10', title: 'Curso A', modulesCount: 0, createdAt: 'x' };
    const detail: CourseDetail = { ...course, modules: [] };
    useAppStore.setState({
      courses: [course],
      activeCourse: detail,
      board: null,
      fetchCourses: jest.fn(),
      fetchCourseDetails: jest.fn(),
    });
    render(<CoursesView />);

    expect(screen.getByText('Curso A', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /publicar curso/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /despublicar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /csv/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /json/i })).toBeInTheDocument();
  });

  it('Navbar mostra o sino de alertas e busca /alerts da equipe ativa', async () => {
    render(<Navbar />);

    expect(screen.getByLabelText(/alertas de prazos/i)).toBeInTheDocument();
    await waitFor(() => expect(api).toHaveBeenCalledWith('GET', '/api/v1/teams/10/alerts'));
  });

  it('CoursesView esconde editar curso, renomear módulo e reordenar módulos e aulas', () => {
    const course: Course = { id: '1', teamId: '10', title: 'Curso A', modulesCount: 1, createdAt: 'x' };
    const detail: CourseDetail = {
      ...course,
      modules: [
        { id: 'm1', courseId: '1', title: 'Mod 1', sortOrder: 0, lessons: [
          { id: 'l1', moduleId: 'm1', title: 'Aula 1', type: 'VIDEO', published: false, sortOrder: 0 },
          { id: 'l2', moduleId: 'm1', title: 'Aula 2', type: 'VIDEO', published: false, sortOrder: 1 },
        ] },
        { id: 'm2', courseId: '1', title: 'Mod 2', sortOrder: 1, lessons: [] },
      ],
    };
    useAppStore.setState({ courses: [course], activeCourse: detail, board: null, fetchCourses: jest.fn(), fetchCourseDetails: jest.fn() });
    render(<CoursesView />);

    expect(screen.queryByRole('button', { name: 'Editar curso' })).not.toBeInTheDocument();
    expect(screen.queryByTitle('Renomear módulo')).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Mover módulo/)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Mover aula/)).not.toBeInTheDocument();
    // editar aula continua (a rota existe)
    expect(screen.getAllByRole('button', { name: /editar aula/i }).length).toBe(2);
  });
});
