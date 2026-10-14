import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PasswordRecoveryDialog } from '@/components/shared/PasswordRecoveryDialog';
import * as apiModule from '@/lib/api';

jest.mock('@/lib/api', () => ({
  apiRequest: jest.fn(),
}));

describe('FE-30 & FE-31 - PasswordRecoveryDialog Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiModule.apiRequest as jest.Mock).mockResolvedValue({ message: 'Código enviado com sucesso' });
  });

  it('renderiza o formulário de solicitação de código no passo 1', () => {
    render(<PasswordRecoveryDialog open={true} onOpenChange={jest.fn()} />);

    expect(screen.getByText(/Recuperar_Acesso/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/seu\.email@exemplo\.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar código/i })).toBeInTheDocument();
  });

  it('avança para o passo 2 após informar e-mail válido', async () => {
    render(<PasswordRecoveryDialog open={true} onOpenChange={jest.fn()} />);

    const emailInput = screen.getByPlaceholderText(/seu\.email@exemplo\.com/i);
    fireEvent.change(emailInput, { target: { value: 'operador@creator.studio' } });

    const submitBtn = screen.getByRole('button', { name: /enviar código/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/482917/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /salvar nova senha/i })).toBeInTheDocument();
    });
  });

  it('permite preencher o código de 6 dígitos e salvar a nova senha', async () => {
    const mockOnOpenChange = jest.fn();
    render(<PasswordRecoveryDialog open={true} onOpenChange={mockOnOpenChange} />);

    // Passo 1
    const emailInput = screen.getByPlaceholderText(/seu\.email@exemplo\.com/i);
    fireEvent.change(emailInput, { target: { value: 'operador@creator.studio' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar código/i }));

    // Passo 2
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/482917/i)).toBeInTheDocument();
    });

    const codeInput = screen.getByPlaceholderText(/482917/i);
    const passInput = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.change(passInput, { target: { value: 'novaSenha123' } });

    const saveBtn = screen.getByRole('button', { name: /salvar nova senha/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
