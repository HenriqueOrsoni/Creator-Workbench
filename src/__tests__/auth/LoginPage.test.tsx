import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';
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

describe('4.2 Componentes de Autenticação — LoginPage (FT-07)', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('FT-07: Renderiza os campos de login e valida credenciais obrigatórias', async () => {
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('operador@creator.studio');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button', { name: /iniciar sessão/i });

    expect(emailInput).toBeRequired();
    expect(passwordInput).toBeRequired();

    // Simula erro de autenticação vindo da API
    (apiModule.apiRequest as jest.Mock).mockRejectedValueOnce(
      new Error('Credenciais invalidas.')
    );

    fireEvent.change(emailInput, { target: { value: 'operador@creator.studio' } });
    fireEvent.change(passwordInput, { target: { value: 'senha-errada' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Credenciais invalidas.')).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('FT-07: Realiza login com sucesso e redireciona para a raiz', async () => {
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('operador@creator.studio');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button', { name: /iniciar sessão/i });

    (apiModule.apiRequest as jest.Mock).mockResolvedValueOnce({
      token: 'jwt-real-token',
      userId: 1,
    });

    fireEvent.change(emailInput, { target: { value: 'teste@teste.com' } });
    fireEvent.change(passwordInput, { target: { value: '123456' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiModule.setCookie).toHaveBeenCalledWith(
        'creator_auth_token',
        'jwt-real-token',
        86400
      );
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
