import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from '@/app/registrar/page';
import * as apiModule from '@/lib/api';
import { useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  apiRequest: jest.fn(),
  setCookie: jest.fn(),
}));

jest.mock('@/components/shared/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

jest.mock('@/components/shared/ThemeColorPicker', () => ({
  ThemeColorPicker: () => <div data-testid="theme-color-picker" />,
}));

describe('4.2 Componentes de Autenticação — RegisterPage (FT-08)', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('FT-08: Etapa 1 — Valida envio de solicitação de token para e-mail', async () => {
    (apiModule.apiRequest as jest.Mock).mockResolvedValueOnce({
      message: 'Codigo de verificacao enviado',
    });

    render(<RegisterPage />);

    const nameInput = screen.getByPlaceholderText('Seu Nome Completo');
    const emailInput = screen.getByPlaceholderText('operador@creator.studio');
    const submitButton = screen.getByRole('button', { name: /receber código de acesso/i });

    expect(nameInput).toBeRequired();
    expect(emailInput).toBeRequired();

    fireEvent.change(nameInput, { target: { value: 'Novo Operador' } });
    fireEvent.change(emailInput, { target: { value: 'operador@teste.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiModule.apiRequest).toHaveBeenCalledWith(
        'POST',
        '/api/auth/register/request-token',
        { name: 'Novo Operador', email: 'operador@teste.com' }
      );
      // Avança para o Step 2
      expect(screen.getByText(/verifique sua caixa de entrada/i)).toBeInTheDocument();
    });
  });

  it('FT-08: Exibe mensagem de erro caso o e-mail já esteja cadastrado', async () => {
    (apiModule.apiRequest as jest.Mock).mockRejectedValueOnce(
      new Error('Este e-mail ja esta registrado no sistema.')
    );

    render(<RegisterPage />);

    const nameInput = screen.getByPlaceholderText('Seu Nome Completo');
    const emailInput = screen.getByPlaceholderText('operador@creator.studio');
    const submitButton = screen.getByRole('button', { name: /receber código de acesso/i });

    fireEvent.change(nameInput, { target: { value: 'Operador' } });
    fireEvent.change(emailInput, { target: { value: 'duplicado@teste.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Este e-mail ja esta registrado no sistema.')).toBeInTheDocument();
    });
  });
});
