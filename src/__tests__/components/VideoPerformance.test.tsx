import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { VideoPerformance } from '@/components/shared/VideoPerformance';
import { CardTaskDialog } from '@/components/shared/CardTaskDialog';
import { useAppStore, ProjectCard, VideoStats } from '@/store/useAppStore';
import { formatCount } from '@/lib/video';

jest.mock('@/lib/features', () => ({
  FEATURES: {
    materials: true, summary: true, review: true, invites: true, coursePublish: true,
    courseCsv: true, courseEdit: true, teamManage: true, accountSecurity: true, alerts: true, youtube: true,
  },
}));

const stats = (over: Partial<VideoStats> = {}): VideoStats => ({
  cardId: '5', videoId: 'abc', videoUrl: 'https://www.youtube.com/watch?v=abc', title: 'Aula 1', publishedAt: '2026-11-01T15:00:00Z',
  latest: { viewCount: 12345, likeCount: null, commentCount: 7, capturedAt: '2026-11-02T15:30:00Z' },
  history: [
    { capturedAt: '2026-11-01T15:00:00Z', viewCount: 10, likeCount: 1, commentCount: 0 },
    { capturedAt: '2026-11-02T15:30:00Z', viewCount: 12345, likeCount: null, commentCount: 7 },
  ],
  ...over,
});

const setup = (over: Record<string, unknown> = {}) => {
  const fns = {
    setCardVideo: jest.fn().mockResolvedValue(true),
    fetchVideoStats: jest.fn().mockResolvedValue(null),
    refreshVideoStats: jest.fn().mockResolvedValue(null),
  };
  useAppStore.setState({ videoStats: {}, ...fns, ...over });
  return fns;
};

describe('formatCount', () => {
  it('formata em pt-BR e usa traço para nulo', () => {
    expect(formatCount(12345)).toBe((12345).toLocaleString('pt-BR'));
    expect(formatCount(null)).toBe('—');
    expect(formatCount(undefined)).toBe('—');
    expect(formatCount(0)).toBe('0');
  });
});

describe('VideoPerformance', () => {
  it('sem link: mostra o estado vazio e não é erro', () => {
    const f = setup();
    render(<VideoPerformance cardId="5" canEdit active />);
    expect(screen.getByTestId('video-empty')).toHaveTextContent('Vincule o vídeo publicado no YouTube');
    expect(f.fetchVideoStats).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /atualizar/i })).toBeNull();
  });

  it('editor vê o campo, Salvar e Remover', async () => {
    const f = setup();
    render(<VideoPerformance cardId="5" videoUrl="https://youtu.be/abc" canEdit active />);
    expect(screen.getByLabelText('Link do vídeo no YouTube')).toHaveValue('https://youtu.be/abc');
    fireEvent.change(screen.getByLabelText('Link do vídeo no YouTube'), { target: { value: 'https://youtu.be/new' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Salvar' })); });
    expect(f.setCardVideo).toHaveBeenCalledWith('5', 'https://youtu.be/new');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Remover' })); });
    expect(f.setCardVideo).toHaveBeenCalledWith('5', '');
  });

  it('revisor vê o link somente leitura, sem Salvar nem Remover', () => {
    setup();
    render(<VideoPerformance cardId="5" videoUrl="https://youtu.be/abc" canEdit={false} active />);
    expect(screen.getByTestId('video-url-readonly')).toHaveTextContent('https://youtu.be/abc');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remover' })).toBeNull();
  });

  it('mostra título como link seguro, tiles com traço e atualização', () => {
    setup({ videoStats: { '5': stats() } });
    render(<VideoPerformance cardId="5" videoUrl="https://youtu.be/abc" canEdit active />);
    const link = screen.getByRole('link', { name: /Aula 1/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByTestId('stat-Visualizações')).toHaveTextContent((12345).toLocaleString('pt-BR'));
    expect(screen.getByTestId('stat-Curtidas')).toHaveTextContent('—');
    expect(screen.getByTestId('stat-Comentários')).toHaveTextContent('7');
    expect(screen.getByText(/Atualizado em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.getByTestId('video-sparkline')).toBeInTheDocument();
  });

  it('título com <b> aparece como texto puro', () => {
    setup({ videoStats: { '5': stats({ title: 'Oi <b>negrito</b>' }) } });
    const { container } = render(<VideoPerformance cardId="5" videoUrl="https://youtu.be/abc" canEdit active />);
    expect(screen.getByTestId('video-title').textContent).toBe('Oi <b>negrito</b>');
    expect(container.querySelector('b')).toBeNull();
  });

  it('Atualizar fica desabilitado enquanto carrega e chama o refresh uma vez', async () => {
    let release: (v: unknown) => void = () => {};
    const f = setup({ videoStats: { '5': stats() } });
    f.refreshVideoStats.mockImplementation(() => new Promise(r => { release = r; }));
    render(<VideoPerformance cardId="5" videoUrl="https://youtu.be/abc" canEdit active />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Atualizar' })); });
    const busy = screen.getByRole('button', { name: /Atualizando/ });
    expect(busy).toBeDisabled();
    fireEvent.click(busy);
    expect(f.refreshVideoStats).toHaveBeenCalledTimes(1);
    await act(async () => { release(null); });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Atualizar' })).toBeEnabled());
  });

  it('busca os números ao abrir a aba quando há link', async () => {
    const f = setup();
    render(<VideoPerformance cardId="5" videoUrl="https://youtu.be/abc" canEdit active />);
    await waitFor(() => expect(f.fetchVideoStats).toHaveBeenCalledWith('5'));
  });
});

describe('CardTaskDialog: aba Desempenho', () => {
  const base: ProjectCard = {
    id: '5', title: 'Projeto', description: '', type: 'PROJECT', sortOrder: 0, progress: 0, tasksTotal: 0, tasksDone: 0, createdAt: 'x',
  };
  const open = (card: ProjectCard, role: 'ADMIN' | 'REVIEWER') => {
    useAppStore.setState({
      activeTeam: { id: 't', name: 'E', role, membersCount: 1, createdAt: 'x' },
      board: { teamId: '1', teamName: 'E', columns: [{ id: 'c', name: 'C', sortOrder: 0, cards: [card] }] },
    });
    render(<CardTaskDialog card={card} open onOpenChange={() => {}} />);
  };

  it('aparece para projetos', () => {
    setup();
    open(base, 'ADMIN');
    expect(screen.getByRole('tab', { name: 'Desempenho' })).toBeInTheDocument();
  });

  it('não aparece para ideias', () => {
    setup();
    open({ ...base, type: 'IDEA' }, 'ADMIN');
    expect(screen.queryByRole('tab', { name: 'Desempenho' })).toBeNull();
  });
});
