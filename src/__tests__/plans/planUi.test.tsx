import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { useAppStore, ProjectCard } from '@/store/useAppStore';
import { PlanView } from '@/components/shared/PlanView';
import { PlanBanner } from '@/components/shared/PlanBanner';
import { CardTaskDialog } from '@/components/shared/CardTaskDialog';
import { mapTeamPlan, planSourceLabel, trialEndsSoon, trialDaysLeft } from '@/lib/plans';
import { canManagePlan } from '@/lib/roles';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const planDto = (over: Record<string, unknown> = {}) => ({
  teamId: 7, plan: 'GRATUITO', planName: 'Gratuito', source: 'FREE', expiresAt: null,
  trialAvailable: true, trialUsedAt: null,
  limits: { maxUsers: 1, maxActiveProjects: 3, maxCourses: 1, automaticSummary: false, storageBytes: 104857600 },
  usage: { members: 1, activeProjects: 2, courses: 0, storageBytes: 1048576 },
  overLimit: false, ...over,
});

const catalog = [
  { plan: 'GRATUITO', name: 'Gratuito', monthlyPrice: 0, limits: { maxUsers: 1, maxActiveProjects: 3, maxCourses: 1, automaticSummary: false, storageBytes: 104857600 } },
  { plan: 'SOLO', name: 'Solo', monthlyPrice: 49, limits: { maxUsers: 1, maxActiveProjects: 10, maxCourses: 5, automaticSummary: false, storageBytes: 1073741824 } },
  { plan: 'PRO', name: 'Pro', monthlyPrice: 99, limits: { maxUsers: 1, maxActiveProjects: null, maxCourses: null, automaticSummary: true, storageBytes: 5368709120 } },
  { plan: 'AGENCIA', name: 'Agência', monthlyPrice: 249, limits: { maxUsers: 5, maxActiveProjects: null, maxCourses: null, automaticSummary: true, storageBytes: 21474836480 } },
].map((p) => ({ ...p }));

function setup(role: 'ADMIN' | 'CREATOR' | 'REVIEWER', dto: Record<string, unknown> = {}) {
  const teamPlan = mapTeamPlan(planDto(dto));
  useAppStore.setState({
    activeTeamId: '7',
    activeTeam: { id: '7', name: 'E', role, membersCount: 1, createdAt: 'x' },
    teamPlan,
    plans: catalog.map((p) => ({ ...p, limits: { ...p.limits } })) as never,
    fetchPlans: jest.fn().mockResolvedValue(undefined),
    fetchTeamPlan: jest.fn().mockResolvedValue(teamPlan),
  });
}

describe('botão "Testar por 14 dias"', () => {
  it('ADMIN com teste disponível vê o botão nos 3 planos pagos', () => {
    setup('ADMIN');
    render(<PlanView />);
    expect(screen.getAllByRole('button', { name: 'Testar por 14 dias' })).toHaveLength(3);
    expect(screen.getByText(/Para contratar, fale com o administrador do sistema/)).toBeInTheDocument();
  });

  it('ADMIN sem teste disponível não vê o botão', () => {
    setup('ADMIN', { trialAvailable: false });
    render(<PlanView />);
    expect(screen.queryByRole('button', { name: 'Testar por 14 dias' })).not.toBeInTheDocument();
  });

  it.each(['CREATOR', 'REVIEWER'] as const)('%s nunca vê o botão', (role) => {
    setup(role);
    render(<PlanView />);
    expect(screen.queryByRole('button', { name: 'Testar por 14 dias' })).not.toBeInTheDocument();
    expect(canManagePlan(role)).toBe(false);
  });

  it('ADMIN de equipe em plano pago não vê o botão mesmo com trialAvailable', () => {
    setup('ADMIN', { plan: 'SOLO', planName: 'Solo', source: 'MANUAL', trialAvailable: true });
    render(<PlanView />);
    expect(screen.queryByRole('button', { name: 'Testar por 14 dias' })).not.toBeInTheDocument();
  });

  it('falha ao carregar o plano mostra erro e "Tentar novamente"', async () => {
    setup('ADMIN');
    const fetchTeamPlan = jest.fn().mockResolvedValue(null);
    useAppStore.setState({ teamPlan: null, fetchTeamPlan });
    render(<PlanView />);
    expect(await screen.findByText(/Não foi possível carregar o plano/)).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' })); });
    expect(fetchTeamPlan).toHaveBeenCalledTimes(2);
  });

  it('clicar chama startTrial com o plano da linha', async () => {
    setup('ADMIN');
    const startTrial = jest.fn().mockResolvedValue(true);
    useAppStore.setState({ startTrial });
    render(<PlanView />);
    await act(async () => { fireEvent.click(within(screen.getByTestId('plan-row-PRO'))); });
    expect(startTrial).toHaveBeenCalledWith('PRO');
  });
});

function within(row: HTMLElement) {
  return row.querySelector('button') as HTMLElement;
}

describe('uso e limites', () => {
  it('limite null é "Ilimitado" e a barra não enche', () => {
    setup('ADMIN', {
      plan: 'PRO', planName: 'Pro',
      limits: { maxUsers: 1, maxActiveProjects: null, maxCourses: null, automaticSummary: true, storageBytes: 5368709120 },
      usage: { members: 1, activeProjects: 12, courses: 4, storageBytes: 0 },
    });
    render(<PlanView />);
    const projects = screen.getByTestId('usage-Projetos ativos');
    expect(projects).toHaveTextContent('12 de Ilimitado');
    const bar = projects.querySelector('[role="progressbar"]') as HTMLElement;
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(screen.getByTestId('usage-Cursos')).toHaveTextContent('4 de Ilimitado');
  });

  it('mostra uso contra o limite com percentual e armazenamento legível', () => {
    setup('ADMIN');
    render(<PlanView />);
    const projects = screen.getByTestId('usage-Projetos ativos');
    expect(projects).toHaveTextContent('2 de 3');
    expect(projects.querySelector('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '67');
    expect(screen.getByTestId('usage-Armazenamento')).toHaveTextContent('1 MB de 100 MB');
  });

  it('mostra a origem do plano e os preços em reais', () => {
    setup('ADMIN', { plan: 'PRO', planName: 'Pro', source: 'TRIAL', expiresAt: '2026-11-27T12:00:00Z' });
    render(<PlanView />);
    expect(screen.getByTestId('current-plan-source').textContent).toMatch(/^Teste até \d{2}\/\d{2}\/\d{4}$/);
    expect(screen.getByText('R$ 249,00/mês')).toBeInTheDocument();
    expect(screen.getByText('R$ 49,00/mês')).toBeInTheDocument();
  });

  it('textos de origem', () => {
    expect(planSourceLabel({ source: 'FREE', expiresAt: null })).toBe('Gratuito');
    expect(planSourceLabel({ source: 'MANUAL', expiresAt: '2026-12-31T12:00:00Z' })).toMatch(/^Ativado pelo administrador até /);
  });
});

describe('dias do teste (calendário local)', () => {
  const now = new Date(2026, 10, 13, 15, 0, 0);
  const at = (d: Date) => ({ source: 'TRIAL' as const, expiresAt: d.toISOString() });
  it('hoje, amanhã e em 3 dias', () => {
    expect(trialDaysLeft(at(new Date(2026, 10, 13, 23, 0, 0)), now)).toBe(0);
    expect(trialDaysLeft(at(new Date(2026, 10, 14, 1, 0, 0)), now)).toBe(1);
    expect(trialDaysLeft(at(new Date(2026, 10, 16, 8, 0, 0)), now)).toBe(3);
    expect(trialEndsSoon(at(new Date(2026, 10, 17, 8, 0, 0)), now)).toBe(false);
  });
});

describe('banner', () => {
  it('aparece quando overLimit', () => {
    setup('ADMIN', { overLimit: true });
    render(<PlanBanner onOpenPlan={() => {}} />);
    expect(screen.getByTestId('plan-banner')).toHaveTextContent(/passou do limite/);
  });

  it('aparece quando o teste acaba em até 3 dias e leva ao plano', () => {
    const soon = new Date(Date.now() + 2 * 86_400_000).toISOString();
    setup('ADMIN', { plan: 'PRO', source: 'TRIAL', expiresAt: soon });
    const open = jest.fn();
    render(<PlanBanner onOpenPlan={open} />);
    expect(screen.getByTestId('plan-banner')).toHaveTextContent(/termina em 2 dias/);
    fireEvent.click(screen.getByRole('button', { name: 'Ver planos' }));
    expect(open).toHaveBeenCalled();
  });

  it('não aparece com teste longe do fim e sem excesso', () => {
    const far = new Date(Date.now() + 10 * 86_400_000).toISOString();
    setup('ADMIN', { source: 'TRIAL', expiresAt: far });
    render(<PlanBanner onOpenPlan={() => {}} />);
    expect(screen.queryByTestId('plan-banner')).not.toBeInTheDocument();
    expect(trialEndsSoon({ source: 'FREE', expiresAt: null })).toBe(false);
  });
});

describe('aba Resumo conforme o plano', () => {
  const card: ProjectCard = {
    id: '5', title: 'Projeto', description: '', type: 'PROJECT', sortOrder: 0, progress: 0,
    tasksTotal: 0, tasksDone: 0, tasks: [], reviewStatus: 'NONE', createdAt: '2026-11-01T10:00:00Z',
  };

  async function openSummary(dto: Record<string, unknown>) {
    setup('ADMIN', dto);
    useAppStore.setState({ fetchCardSummary: jest.fn().mockResolvedValue(null) });
    render(<CardTaskDialog card={card} open onOpenChange={() => {}} />);
    const tab = screen.getByRole('tab', { name: /Resumo/ });
    await act(async () => { fireEvent.mouseDown(tab); fireEvent.click(tab); });
  }

  it('Gratuito: mostra o aviso e esconde o botão de gerar', async () => {
    await openSummary({});
    expect(screen.getByTestId('summary-plan-gate')).toHaveTextContent('Disponível nos planos Pro e Agência');
    expect(screen.queryByRole('button', { name: /Gerar/ })).not.toBeInTheDocument();
  });

  it('Pro: mostra o botão de gerar', async () => {
    await openSummary({ plan: 'PRO', limits: { maxUsers: 1, maxActiveProjects: null, maxCourses: null, automaticSummary: true, storageBytes: 1 } });
    expect(screen.queryByTestId('summary-plan-gate')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gerar Resumo/ })).toBeInTheDocument();
  });
});
