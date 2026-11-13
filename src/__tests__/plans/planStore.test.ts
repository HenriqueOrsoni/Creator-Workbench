import { useAppStore } from '@/store/useAppStore';
import * as apiModule from '@/lib/api';
import { toast } from 'sonner';
import { onPlanPageRequest } from '@/lib/plan-nav';
import { mapTeamPlan } from '@/lib/plans';

jest.mock('@/lib/api', () => ({
  apiRequest: jest.fn(),
  apiDownload: jest.fn(),
  apiOpenInline: jest.fn(),
  getCookie: jest.fn(),
  setCookie: jest.fn(),
  deleteCookie: jest.fn(),
  registerApiHooks: jest.fn(),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const api = apiModule.apiRequest as jest.Mock;
const apiError = (message: string, status: number) => Object.assign(new Error(message), { status });

const planDto = (over: Record<string, unknown> = {}) => ({
  teamId: 7, plan: 'GRATUITO', planName: 'Gratuito', source: 'FREE', expiresAt: null,
  trialAvailable: true, trialUsedAt: null,
  limits: { maxUsers: 1, maxActiveProjects: 3, maxCourses: 1, automaticSummary: false, storageBytes: 104857600 },
  usage: { members: 1, activeProjects: 2, courses: 0, storageBytes: 1024 },
  overLimit: false, ...over,
});

const team = { id: '7', name: 'E', role: 'ADMIN' as const, membersCount: 1, createdAt: 'x', plan: 'GRATUITO' as const };

beforeEach(() => {
  jest.clearAllMocks();
  api.mockReset();
  useAppStore.setState({ activeTeamId: '7', activeTeam: team, teams: [team], teamPlan: null, plans: [] });
});

describe('planos na store', () => {
  it('fetchPlans mapeia a lista e null continua null (ilimitado)', async () => {
    api.mockResolvedValue([
      { plan: 'GRATUITO', name: 'Gratuito', monthlyPrice: 0, limits: { maxUsers: 1, maxActiveProjects: 3, maxCourses: 1, automaticSummary: false, storageBytes: 100 } },
      { plan: 'PRO', name: 'Pro', monthlyPrice: 99.0, limits: { maxUsers: 1, maxActiveProjects: null, maxCourses: null, automaticSummary: true, storageBytes: 500 } },
    ]);
    await useAppStore.getState().fetchPlans();
    expect(api).toHaveBeenCalledWith('GET', '/api/v1/plans');
    const plans = useAppStore.getState().plans;
    expect(plans[1].limits.maxCourses).toBeNull();
    expect(plans[1].monthlyPrice).toBe(99);
  });

  it('fetchTeamPlan mapeia o plano e o uso', async () => {
    api.mockResolvedValue(planDto());
    const p = await useAppStore.getState().fetchTeamPlan();
    expect(api).toHaveBeenCalledWith('GET', '/api/v1/teams/7/plan');
    expect(p?.usage.activeProjects).toBe(2);
    expect(useAppStore.getState().teamPlan?.trialAvailable).toBe(true);
  });

  it('fetchTeamPlan com falha não altera o plano e mostra a mensagem do servidor', async () => {
    api.mockRejectedValue(apiError('Acesso negado.', 403));
    const p = await useAppStore.getState().fetchTeamPlan();
    expect(p).toBeNull();
    expect(useAppStore.getState().teamPlan).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('Acesso negado.');
  });

  it('startTrial envia o plano, atualiza o plano e o selo da equipe', async () => {
    api.mockResolvedValue(planDto({ plan: 'PRO', planName: 'Pro', source: 'TRIAL', expiresAt: '2026-11-27T10:00:00Z', trialAvailable: false }));
    const ok = await useAppStore.getState().startTrial('PRO');
    expect(ok).toBe(true);
    expect(api).toHaveBeenCalledWith('POST', '/api/v1/teams/7/plan/trial', { plan: 'PRO' });
    const s = useAppStore.getState();
    expect(s.teamPlan?.source).toBe('TRIAL');
    expect(s.activeTeam?.plan).toBe('PRO');
    expect(s.teams[0].planSource).toBe('TRIAL');
    expect(toast.success).toHaveBeenCalled();
  });

  it('startTrial 409 (teste já usado): nada muda e aparece a mensagem do servidor', async () => {
    api.mockRejectedValue(apiError('O teste gratuito já foi usado por esta equipe.', 409));
    useAppStore.setState({ teamPlan: mapTeamPlan(planDto()) });
    const ok = await useAppStore.getState().startTrial('SOLO');
    expect(ok).toBe(false);
    expect(useAppStore.getState().activeTeam?.plan).toBe('GRATUITO');
    expect(useAppStore.getState().teamPlan?.source).toBe('FREE');
    expect(toast.error).toHaveBeenCalledWith('O teste gratuito já foi usado por esta equipe.');
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('erro 402 (limite do plano)', () => {
  it('toast com a mensagem do servidor e a ação "Ver planos" que abre a aba Plano', async () => {
    api.mockRejectedValue(apiError('Seu plano permite apenas 3 projetos ativos.', 402));
    const opened = jest.fn();
    const off = onPlanPageRequest(opened);

    const r = await useAppStore.getState().createBoardCard({ title: 'Projeto' } as never);
    expect(r).toBeNull();
    const call = (toast.error as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('Seu plano permite apenas 3 projetos ativos.');
    expect(call[1].action.label).toBe('Ver planos');
    call[1].action.onClick();
    expect(opened).toHaveBeenCalledTimes(1);
    off();
  });

  it('um 402 recarrega o plano da equipe (uso desatualizado)', async () => {
    api.mockImplementation((method: string, path: string) =>
      method === 'GET' && path === '/api/v1/teams/7/plan'
        ? Promise.resolve(planDto({ usage: { members: 1, activeProjects: 3, courses: 0, storageBytes: 0 } }))
        : Promise.reject(apiError('Limite atingido.', 402)));
    await useAppStore.getState().createBoardCard({ title: 'Projeto' } as never);
    await new Promise((r) => setTimeout(r, 0));
    expect(api).toHaveBeenCalledWith('GET', '/api/v1/teams/7/plan');
    expect(useAppStore.getState().teamPlan?.usage.activeProjects).toBe(3);
  });

  it('outros erros não ganham a ação', async () => {
    api.mockRejectedValue(apiError('Título inválido.', 400));
    await useAppStore.getState().createBoardCard({ title: 'x' } as never);
    expect(toast.error).toHaveBeenCalledWith('Título inválido.');
  });

  it('createTeam 402 não cria a equipe', async () => {
    api.mockRejectedValue(apiError('Seu plano permite apenas uma equipe compartilhada.', 402));
    const r = await useAppStore.getState().createTeam('Nova');
    expect(r).toBeNull();
    expect(useAppStore.getState().teams).toHaveLength(1);
    expect((toast.error as jest.Mock).mock.calls[0][1].action.label).toBe('Ver planos');
  });
});
