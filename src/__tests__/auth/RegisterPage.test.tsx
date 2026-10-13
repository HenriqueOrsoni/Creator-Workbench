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

  // TF-06 / FE-32: Confirmação de senha e validação de tamanho mínimo no cadastro
  it('FT-08 (TF-06): Etapa 2 — Valida que senhas devem ter no mínimo 6 caracteres e coincidir', async () => {
    (apiModule.apiRequest as jest.Mock).mockResolvedValueOnce({
      message: 'Codigo de verificacao enviado',
    });

    render(<RegisterPage />);

    // Avança para a Etapa 2
    fireEvent.change(screen.getByPlaceholderText('Seu Nome Completo'), { target: { value: 'Operador Teste' } });
    fireEvent.change(screen.getByPlaceholderText('operador@creator.studio'), { target: { value: 'operador@teste.com' } });
    fireEvent.click(screen.getByRole('button', { name: /receber código de acesso/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });

    const tokenInput = screen.getByPlaceholderText('000000');
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const passwordInput = passwordInputs[0];
    const confirmPasswordInput = passwordInputs[1];
    const submitButton = screen.getByRole('button', { name: /confirmar e acessar/i });

    // Testa senhas que não coincidem
    fireEvent.change(tokenInput, { target: { value: '123456' } });
    fireEvent.change(passwordInput, { target: { value: '123456' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '654321' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
    });

    // Testa senha menor que 6 caracteres
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('A senha deve ter no mínimo 6 caracteres.')).toBeInTheDocument();
    });
  });
});
