import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore, ProjectCard, CourseDetail, Course } from '@/store/useAppStore';
import { CardTaskDialog } from '@/components/shared/CardTaskDialog';
import { CoursesView } from '@/components/shared/CoursesView';
import * as apiModule from '@/lib/api';

jest.mock('@/lib/api', () => ({
  apiRequest: jest.fn(),
  apiDownload: jest.fn(),
  getCookie: jest.fn().mockReturnValue('tok'),
  setCookie: jest.fn(),
  deleteCookie: jest.fn(),
  registerApiHooks: jest.fn(),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { toast } from 'sonner';

const api = apiModule.apiRequest as jest.Mock;
const download = apiModule.apiDownload as jest.Mock;

const team = (role: 'ADMIN' | 'CREATOR' | 'REVIEWER') => ({ id: '7', name: 'E', role, membersCount: 1, createdAt: 'x' });

const card: ProjectCard = {
  id: '5', title: 'Projeto', description: '', type: 'PROJECT', sortOrder: 0, progress: 0,
  tasksTotal: 0, tasksDone: 0, tasks: [], reviewStatus: 'NONE', createdAt: '2026-11-01T10:00:00Z',
};

function apiError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function setRole(role: 'ADMIN' | 'CREATOR' | 'REVIEWER') {
  useAppStore.setState({ activeTeam: team(role), activeTeamId: '7' });
}

const mat = { id: '1', cardId: '5', fileName: '<img src=x onerror=alert(1)>.pdf', contentType: 'application/pdf', sizeBytes: 2048, createdAt: 'x', uploadedBy: { userId: '3', name: 'Ana' } };

async function openTab(name: RegExp) {
  render(<CardTaskDialog card={card} open={true} onOpenChange={() => {}} />);
  await userEvent.click(screen.getByRole('tab', { name }));
}

describe('M2: aba Resumo IA', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetStore();
  });

  it('GET 404 mostra o estado vazio (sem toast de erro) e o botão para Criador', async () => {
    setRole('CREATOR');
    api.mockRejectedValue(apiError('Nenhum resumo gerado para este projeto.', 404));
    await openTab(/resumo/i);

    expect(await screen.findByText(/Nenhum resumo gerado para este projeto\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gerar resumo/i })).toBeEnabled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('Revisor não vê o botão de gerar', async () => {
    setRole('REVIEWER');
    api.mockRejectedValue(apiError('Nenhum resumo gerado para este projeto.', 404));
    await openTab(/resumo/i);

    await screen.findByText(/Nenhum resumo gerado/);
    expect(screen.queryByRole('button', { name: /gerar/i })).not.toBeInTheDocument();
  });

  it('mostra o resumo como texto puro (marcação não é interpretada)', async () => {
    setRole('ADMIN');
    api.mockResolvedValue({ cardId: 5, summary: 'Linha <script>alert(1)</script> <b>negrito</b>', generatedAt: '2026-11-12T10:00:00Z', basedOn: 'SCRIPT' });
    await openTab(/resumo/i);

    const text = await screen.findByTestId('summary-text');
    expect(text.textContent).toBe('Linha <script>alert(1)</script> <b>negrito</b>');
    expect(text.querySelector('script, b')).toBeNull();
  });

  it('durante a geração o botão fica desabilitado e, no 503, o resumo anterior continua na tela', async () => {
    setRole('ADMIN');
    useAppStore.setState({ cardSummaries: { '5': { cardId: '5', summary: 'Resumo antigo', generatedAt: '2026-11-10T10:00:00Z', basedOn: 'SCRIPT' } } });
    let reject: (e: unknown) => void = () => {};
    api.mockImplementation((method: string) =>
      method === 'POST'
        ? new Promise((_, rej) => { reject = rej; })
        : Promise.resolve({ cardId: 5, summary: 'Resumo antigo', generatedAt: '2026-11-10T10:00:00Z', basedOn: 'SCRIPT' }));
    await openTab(/resumo/i);

    await screen.findByText('Resumo antigo');
    await userEvent.click(screen.getByRole('button', { name: /gerar novo resumo/i }));

    const busy = await screen.findByRole('button', { name: /gerando/i });
    expect(busy).toBeDisabled();

    reject(apiError('Não foi possível gerar o resumo agora. Tente novamente.', 503));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Não foi possível gerar o resumo agora. Tente novamente.'));
    expect(screen.getByText('Resumo antigo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gerar novo resumo/i })).toBeEnabled();
  });
});

describe('M2: aba Revisão', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetStore();
  });

  const reviews = [
    { id: 2, cardId: 5, decision: 'CHANGES_REQUESTED', comment: '<b>Ajustar</b> o roteiro', reviewer: { userId: 4, name: 'Rui' }, createdAt: '2026-11-12T10:00:00Z' },
    { id: 1, cardId: 5, decision: 'APPROVED', comment: '', reviewer: null, createdAt: '2026-11-11T10:00:00Z' },
  ];

  it('lista o histórico de revisões com comentário em texto puro', async () => {
    setRole('CREATOR');
    api.mockResolvedValue(reviews);
    await openTab(/revisão/i);

    const comment = await screen.findByText('<b>Ajustar</b> o roteiro');
    expect(comment.querySelector('b')).toBeNull();
    expect(screen.getByText(/Por Rui/)).toBeInTheDocument();
    expect(screen.getByText(/Revisor removido/)).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('GET', '/api/v1/teams/7/cards/5/reviews');
  });

  it('Criador não vê o formulário de decisão; Revisor e Administrador veem', async () => {
    setRole('CREATOR');
    api.mockResolvedValue([]);
    const { unmount } = render(<CardTaskDialog card={card} open={true} onOpenChange={() => {}} />);
    await userEvent.click(screen.getByRole('tab', { name: /revisão/i }));
    await screen.findByText(/Nenhuma revisão registrada/);
    expect(screen.queryByRole('button', { name: /registrar decisão/i })).not.toBeInTheDocument();
    unmount();

    for (const role of ['REVIEWER', 'ADMIN'] as const) {
      setRole(role);
      const view = render(<CardTaskDialog card={card} open={true} onOpenChange={() => {}} />);
      await userEvent.click(screen.getByRole('tab', { name: /revisão/i }));
      expect(await screen.findByRole('button', { name: /registrar decisão/i })).toBeInTheDocument();
      view.unmount();
    }
  });

  it('pedir alterações exige comentário e o campo limita 2000 caracteres', async () => {
    setRole('REVIEWER');
    api.mockResolvedValue([]);
    await openTab(/revisão/i);

    await userEvent.click(await screen.findByRole('button', { name: /pedir alterações/i }));
    expect(screen.getByRole('button', { name: /registrar decisão/i })).toBeDisabled();
    expect(screen.getByLabelText('Comentários de revisão')).toHaveAttribute('maxLength', '2000');
  });

  it('400 do servidor mantém o texto do comentário; sucesso limpa', async () => {
    setRole('REVIEWER');
    let fail = true;
    api.mockImplementation((method: string, path: string) => {
      if (method === 'POST') return fail ? Promise.reject(apiError('O comentário deve ter no máximo 2000 caracteres.', 400)) : Promise.resolve({ id: 1 });
      if (path.endsWith('/board')) return Promise.resolve({ teamId: 7, teamName: 'E', columns: [] });
      return Promise.resolve([]);
    });
    await openTab(/revisão/i);

    await userEvent.click(await screen.findByRole('button', { name: /pedir alterações/i }));
    const input = screen.getByLabelText('Comentários de revisão');
    await userEvent.type(input, 'Ajustar o início');
    await userEvent.click(screen.getByRole('button', { name: /registrar decisão/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('O comentário deve ter no máximo 2000 caracteres.'));
    expect(input).toHaveValue('Ajustar o início');

    fail = false;
    await userEvent.click(screen.getByRole('button', { name: /registrar decisão/i }));
    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('erro 403 do servidor aparece no toast e nada é registrado', async () => {
    setRole('REVIEWER');
    api.mockImplementation((method: string) =>
      method === 'POST' ? Promise.reject(apiError('Somente Administrador e Revisor podem revisar.', 403)) : Promise.resolve([]));
    await openTab(/revisão/i);

    await userEvent.click(await screen.findByRole('button', { name: /registrar decisão/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Somente Administrador e Revisor podem revisar.'));
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('M2: aba Materiais', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetStore();
  });

  it('Revisor lista e baixa, mas não vê envio nem exclusão; nome do arquivo é texto puro', async () => {
    setRole('REVIEWER');
    api.mockResolvedValue([{ ...mat, uploadedBy: { userId: 3, name: 'Ana' } }]);
    await openTab(/materiais/i);

    expect(await screen.findByText(mat.fileName)).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.queryByText(/clique para enviar/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^excluir/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /baixar/i }));
    expect(download).toHaveBeenCalledWith('/api/v1/teams/7/materials/1/download', mat.fileName);
  });

  it('Criador vê envio e exclusão', async () => {
    setRole('CREATOR');
    api.mockResolvedValue([{ ...mat, uploadedBy: { userId: 3, name: 'Ana' } }]);
    await openTab(/materiais/i);

    expect(await screen.findByText(/clique para enviar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^excluir/i })).toBeInTheDocument();
  });

  it('o rótulo da aba usa materialsCount do card antes de abrir a aba', () => {
    setRole('CREATOR');
    api.mockResolvedValue([]);
    render(<CardTaskDialog card={{ ...card, materialsCount: 3 }} open={true} onOpenChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Materiais (3)' })).toBeInTheDocument();
  });

  it('413 no envio: sem barra em 100%, a barra some na hora e a mensagem do servidor aparece', async () => {
    setRole('CREATOR');
    let reject: (e: unknown) => void = () => {};
    api.mockImplementation((method: string) =>
      method === 'POST' ? new Promise((_, rej) => { reject = rej; }) : Promise.resolve([]));
    await openTab(/materiais/i);
    await screen.findByText(/Nenhum arquivo anexado/);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } });
    const bar = await screen.findByTestId('upload-progress');
    expect(bar.innerHTML).not.toContain('100%');

    reject(apiError('O arquivo excede o limite de 20 MB.', 413));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('O arquivo excede o limite de 20 MB.'));
    await waitFor(() => expect(screen.queryByTestId('upload-progress')).not.toBeInTheDocument());
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('excluir pede confirmação (avisa dos vínculos) e o clique duplo exclui uma vez só', async () => {
    setRole('CREATOR');
    let resolveDelete: (v: unknown) => void = () => {};
    api.mockImplementation((method: string) =>
      method === 'DELETE' ? new Promise((res) => { resolveDelete = res; }) : Promise.resolve([{ ...mat, uploadedBy: { userId: 3, name: 'Ana' } }]));
    await openTab(/materiais/i);

    await userEvent.click(await screen.findByRole('button', { name: /^excluir/i }));
    expect(api.mock.calls.some((c) => c[0] === 'DELETE')).toBe(false);
    expect(screen.getByText(/vínculos dele com aulas também serão removidos/i)).toBeInTheDocument();

    const confirm = screen.getByRole('button', { name: /confirmar exclusão/i });
    await userEvent.dblClick(confirm);
    expect(api.mock.calls.filter((c) => c[0] === 'DELETE')).toHaveLength(1);
    resolveDelete(null);
    await waitFor(() => expect(screen.queryByText(/vínculos dele/i)).not.toBeInTheDocument());
  });

  it('arquivo com extensão não permitida é barrado antes do envio, com mensagem', async () => {
    setRole('CREATOR');
    api.mockResolvedValue([]);
    await openTab(/materiais/i);
    await screen.findByText(/Nenhum arquivo anexado/);
    api.mockClear();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const exe = new File(['x'], 'programa.exe', { type: 'application/x-msdownload' });
    fireEvent.change(input, { target: { files: [exe] } });

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect((toast.error as jest.Mock).mock.calls[0][0]).toMatch(/formato não suportado/i);
    expect(api.mock.calls.some((c) => c[0] === 'POST')).toBe(false);
  });
});

describe('M2: materiais da aula', () => {
  const course: Course = { id: '1', teamId: '7', title: 'Curso A', modulesCount: 1, createdAt: 'x' };
  const detail = (linked: unknown[]): CourseDetail => ({
    ...course,
    modules: [{ id: '2', courseId: '1', title: 'Mod', sortOrder: 0, lessons: [
      { id: '3', moduleId: '2', title: 'Aula 1', type: 'VIDEO', published: false, sortOrder: 0, projectId: '5', materials: linked as never },
    ] }],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetStore();
    api.mockResolvedValue([]);
  });

  function setup(role: 'ADMIN' | 'CREATOR' | 'REVIEWER', linked: unknown[] = []) {
    useAppStore.setState({
      activeTeam: team(role), activeTeamId: '7',
      courses: [course], activeCourse: detail(linked),
      cardMaterials: { '5': [mat, { ...mat, id: '2', fileName: 'outro.pdf' }] },
      fetchCourses: jest.fn(), fetchCourseDetails: jest.fn(),
      board: { teamId: '7', teamName: 'E', columns: [{ id: '1', name: 'A', sortOrder: 0, cards: [card] }] },
    });
    render(<CoursesView />);
  }

  it('Criador vincula um material do projeto da aula', async () => {
    setup('CREATOR');
    api.mockImplementation((method: string, path: string) =>
      Promise.resolve(path.includes('/materials') && method === 'GET' ? [mat, { ...mat, id: '2', fileName: 'outro.pdf' }] : {}));

    await userEvent.click(screen.getByRole('button', { name: /materiais da aula aula 1/i }));
    const select = await screen.findByLabelText(/vincular material do projeto/i);
    await userEvent.selectOptions(select, '2');
    await userEvent.click(screen.getByRole('button', { name: /^vincular$/i }));

    await waitFor(() => expect(api).toHaveBeenCalledWith(
      'POST', '/api/v1/teams/7/courses/1/modules/2/lessons/3/materials', { materialId: 2 }));
  });

  it('409 ao vincular mostra a mensagem do servidor', async () => {
    setup('ADMIN');
    api.mockImplementation((method: string) =>
      method === 'POST' ? Promise.reject(apiError('Este material já está vinculado à aula.', 409)) : Promise.resolve([mat, { ...mat, id: '2', fileName: 'outro.pdf' }]));

    await userEvent.click(screen.getByRole('button', { name: /materiais da aula aula 1/i }));
    await userEvent.selectOptions(await screen.findByLabelText(/vincular material do projeto/i), '2');
    await userEvent.click(screen.getByRole('button', { name: /^vincular$/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Este material já está vinculado à aula.'));
  });

  it('Criador desvincula um material já ligado', async () => {
    setup('CREATOR', [mat]);
    api.mockResolvedValue(null);

    await userEvent.click(screen.getByRole('button', { name: /materiais da aula aula 1/i }));
    await userEvent.click(await screen.findByRole('button', { name: /^desvincular/i }));

    await waitFor(() => expect(api).toHaveBeenCalledWith(
      'DELETE', '/api/v1/teams/7/courses/1/modules/2/lessons/3/materials/1'));
  });

  it('aula sem projeto: escolhe qualquer projeto da equipe e vincula o material dele', async () => {
    setup('CREATOR');
    useAppStore.setState({
      activeCourse: { ...detail([]), modules: [{ id: '2', courseId: '1', title: 'Mod', sortOrder: 0, lessons: [
        { id: '3', moduleId: '2', title: 'Aula 1', type: 'VIDEO', published: false, sortOrder: 0 },
      ] }] },
    });
    api.mockImplementation((method: string, path: string) =>
      Promise.resolve(method === 'GET' && path.includes('/cards/5/materials') ? [mat, { ...mat, id: '2', fileName: 'outro.pdf' }] : {}));

    await userEvent.click(screen.getByRole('button', { name: /materiais da aula aula 1/i }));
    await userEvent.selectOptions(await screen.findByLabelText('Projeto do material'), '5');
    await userEvent.selectOptions(await screen.findByLabelText(/vincular material do projeto/i), '2');
    await userEvent.click(screen.getByRole('button', { name: /^vincular$/i }));

    await waitFor(() => expect(api).toHaveBeenCalledWith(
      'POST', '/api/v1/teams/7/courses/1/modules/2/lessons/3/materials', { materialId: 2 }));
  });

  it('projeto excluído (404 ao listar materiais) não mostra aviso de erro', async () => {
    setup('CREATOR');
    api.mockRejectedValue(apiError('Card não encontrado.', 404));

    await userEvent.click(screen.getByRole('button', { name: /materiais da aula aula 1/i }));
    await screen.findByText(/Nenhum material vinculado/);
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('Revisor só vê e baixa: sem seletor de vínculo e sem desvincular', async () => {
    setup('REVIEWER', [mat]);

    await userEvent.click(screen.getByRole('button', { name: /materiais da aula aula 1/i }));
    expect(await screen.findByText(mat.fileName)).toBeInTheDocument();
    expect(screen.queryByLabelText(/vincular material do projeto/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^desvincular/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^baixar/i })).toBeInTheDocument();
  });
});
