import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateIdeaDialog } from '@/components/shared/CreateIdeaDialog';
import { useAppStore } from '@/store/useAppStore';

describe('TF-08 - CreateIdeaDialog Component Tests', () => {
  const mockAddIdea = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState({ addIdea: mockAddIdea });
  });

  it('renderiza o botão trigger e abre o diálogo ao ser clicado', () => {
    render(<CreateIdeaDialog />);

    const triggerBtn = screen.getByRole('button', { name: /nova_ideia/i });
    expect(triggerBtn).toBeInTheDocument();

    fireEvent.click(triggerBtn);
    expect(screen.getByText(/capturar_/i)).toBeInTheDocument();
  });

  it('valida campos obrigatórios e submete nova ideia com sucesso', async () => {
    render(<CreateIdeaDialog />);

    const triggerBtn = screen.getByRole('button', { name: /nova_ideia/i });
    fireEvent.click(triggerBtn);

    const titleInput = screen.getByPlaceholderText(/minha nova série/i);
    const descInput = screen.getByPlaceholderText(/sobre o que é essa ideia/i);

    fireEvent.change(titleInput, { target: { value: 'Série sobre Inteligência Artificial' } });
    fireEvent.change(descInput, { target: { value: 'Gravar 5 episódios detalhando arquitetura e modelos de linguagem.' } });

    const submitBtn = screen.getByRole('button', { name: /salvar ideia/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(mockAddIdea).toHaveBeenCalledWith(
        'Série sobre Inteligência Artificial',
        'Gravar 5 episódios detalhando arquitetura e modelos de linguagem.'
      );
    });
  });
});
