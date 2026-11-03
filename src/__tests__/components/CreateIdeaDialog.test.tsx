import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateIdeaDialog } from '@/components/shared/CreateIdeaDialog';
import { useAppStore } from '@/store/useAppStore';

describe('TF-08 - CreateIdeaDialog Component Tests (BF-01 & BF-02)', () => {
  const mockCreateInboxIdea = jest.fn();
  const mockAddIdea = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState({
      activeTeamId: 'team-1',
      createInboxIdea: mockCreateInboxIdea,
      addIdea: mockAddIdea,
    });
  });

  it('renderiza o botão trigger e abre o diálogo unificado ao ser clicado', () => {
    render(<CreateIdeaDialog />);

    const triggerBtn = screen.getByRole('button', { name: /nova_ideia/i });
    expect(triggerBtn).toBeInTheDocument();

    fireEvent.click(triggerBtn);
    expect(screen.getByText(/capturar nova ideia/i)).toBeInTheDocument();
  });

  it('valida campos e submete ideia unificada com campos pedagógicos e etiqueta para a Caixa de Entrada', async () => {
    render(<CreateIdeaDialog />);

    const triggerBtn = screen.getByRole('button', { name: /nova_ideia/i });
    fireEvent.click(triggerBtn);

    const titleInput = screen.getByPlaceholderText(/minicurso sobre algoritmos/i);
    const descInput = screen.getByPlaceholderText(/anotações rápidas/i);
    const audienceInput = screen.getByPlaceholderText(/iniciantes em cs/i);
    const objectiveInput = screen.getByPlaceholderText(/compreender bfs e dfs/i);
    const tagSelect = screen.getByLabelText(/etiqueta/i);

    fireEvent.change(titleInput, { target: { value: 'Série sobre Inteligência Artificial' } });
    fireEvent.change(descInput, { target: { value: 'Gravar 5 episódios detalhando arquitetura e modelos de linguagem.' } });
    fireEvent.change(audienceInput, { target: { value: 'Desenvolvedores Júnior' } });
    fireEvent.change(objectiveInput, { target: { value: 'Compreender Transformers e Embeddings' } });
    fireEvent.change(tagSelect, { target: { value: 'Tutorial' } });

    const submitBtn = screen.getByRole('button', { name: /guardar na inbox/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(mockCreateInboxIdea).toHaveBeenCalledWith({
        title: 'Série sobre Inteligência Artificial',
        description: 'Gravar 5 episódios detalhando arquitetura e modelos de linguagem.',
        targetAudience: 'Desenvolvedores Júnior',
        pedagogicalObjective: 'Compreender Transformers e Embeddings',
        tag: 'Tutorial',
      });
    });
  });

  it('faz fallback para addIdea quando não há equipe ativa', async () => {
    useAppStore.setState({
      activeTeamId: null,
      createInboxIdea: undefined,
      addIdea: mockAddIdea,
    });

    render(<CreateIdeaDialog />);

    const triggerBtn = screen.getByRole('button', { name: /nova_ideia/i });
    fireEvent.click(triggerBtn);

    const titleInput = screen.getByPlaceholderText(/minicurso sobre algoritmos/i);
    const descInput = screen.getByPlaceholderText(/anotações rápidas/i);

    fireEvent.change(titleInput, { target: { value: 'Ideia Legada Sem Equipe' } });
    fireEvent.change(descInput, { target: { value: 'Notas sobre a ideia legada.' } });

    const submitBtn = screen.getByRole('button', { name: /guardar na inbox/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(mockAddIdea).toHaveBeenCalledWith('Ideia Legada Sem Equipe', 'Notas sobre a ideia legada.');
    });
  });
});
