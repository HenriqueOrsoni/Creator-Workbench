import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateIdeaDialog } from '@/components/shared/CreateIdeaDialog';
import { useAppStore } from '@/store/useAppStore';

describe('TF-08 - CreateIdeaDialog Component Tests (BF-01 & BF-02)', () => {
  const mockCreateInboxIdea = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState({
      activeTeamId: 'team-1',
      createInboxIdea: mockCreateInboxIdea,
      teamTags: [
        { id: '3', name: 'Tutorial', color: '#2E7D32' },
        { id: '4', name: 'Podcast', color: '#1565C0' },
      ],
    });
  });

  it('renderiza o botão trigger e abre o diálogo unificado ao ser clicado', () => {
    render(<CreateIdeaDialog />);

    const triggerBtn = screen.getByRole('button', { name: /nova_ideia/i });
    expect(triggerBtn).toBeInTheDocument();

    fireEvent.click(triggerBtn);
    expect(screen.getByText(/capturar nova ideia/i)).toBeInTheDocument();
  });

  it('lista só as etiquetas que vieram do servidor', () => {
    render(<CreateIdeaDialog />);
    fireEvent.click(screen.getByRole('button', { name: /nova_ideia/i }));

    const options = screen.getAllByRole('option').map(o => o.textContent);
    expect(options).toEqual(['Sem etiqueta', 'Tutorial', 'Podcast']);
  });

  it('valida campos e envia a ideia com tagId (e não o nome da etiqueta)', async () => {
    mockCreateInboxIdea.mockResolvedValue({ id: '9' });
    render(<CreateIdeaDialog />);

    fireEvent.click(screen.getByRole('button', { name: /nova_ideia/i }));

    fireEvent.change(screen.getByPlaceholderText(/minicurso sobre algoritmos/i), { target: { value: 'Série sobre Inteligência Artificial' } });
    fireEvent.change(screen.getByPlaceholderText(/anotações rápidas/i), { target: { value: 'Gravar 5 episódios detalhando arquitetura e modelos de linguagem.' } });
    fireEvent.change(screen.getByPlaceholderText(/iniciantes em cs/i), { target: { value: 'Desenvolvedores Júnior' } });
    fireEvent.change(screen.getByPlaceholderText(/compreender bfs e dfs/i), { target: { value: 'Compreender Transformers e Embeddings' } });
    fireEvent.change(screen.getByLabelText(/etiqueta/i), { target: { value: '3' } });

    const submitBtn = screen.getByRole('button', { name: /guardar na inbox/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(mockCreateInboxIdea).toHaveBeenCalledWith({
        title: 'Série sobre Inteligência Artificial',
        description: 'Gravar 5 episódios detalhando arquitetura e modelos de linguagem.',
        targetAudience: 'Desenvolvedores Júnior',
        pedagogicalObjective: 'Compreender Transformers e Embeddings',
        tagId: 3,
      });
    });
  });

  it('sem etiqueta escolhida envia tagId indefinido', async () => {
    mockCreateInboxIdea.mockResolvedValue({ id: '9' });
    render(<CreateIdeaDialog />);
    fireEvent.click(screen.getByRole('button', { name: /nova_ideia/i }));

    fireEvent.change(screen.getByPlaceholderText(/minicurso sobre algoritmos/i), { target: { value: 'Ideia sem etiqueta' } });
    fireEvent.submit(screen.getByRole('button', { name: /guardar na inbox/i }).closest('form')!);

    await waitFor(() => {
      expect(mockCreateInboxIdea).toHaveBeenCalledWith(expect.objectContaining({ title: 'Ideia sem etiqueta', tagId: undefined }));
    });
  });

  it('quando o servidor recusa a ideia, o diálogo continua aberto com o que foi digitado', async () => {
    mockCreateInboxIdea.mockResolvedValue(null);
    render(<CreateIdeaDialog />);
    fireEvent.click(screen.getByRole('button', { name: /nova_ideia/i }));

    fireEvent.change(screen.getByPlaceholderText(/minicurso sobre algoritmos/i), { target: { value: 'Ideia que falha' } });
    fireEvent.submit(screen.getByRole('button', { name: /guardar na inbox/i }).closest('form')!);

    await waitFor(() => expect(mockCreateInboxIdea).toHaveBeenCalled());
    expect(screen.getByText(/capturar nova ideia/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ideia que falha')).toBeInTheDocument();
  });
});
