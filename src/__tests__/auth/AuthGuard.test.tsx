import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { useRouter, usePathname } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

describe('4.2 Componentes de Autenticação — AuthGuard (FT-09 a FT-11)', () => {
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    document.cookie = '';
    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
    });
  });

  // FT-09: AuthGuard redireciona para /login sem token
  it('FT-09: AuthGuard redireciona para /login quando não há token e rota é protegida', () => {
    (usePathname as jest.Mock).mockReturnValue('/');

    render(
      <AuthGuard>
        <div>Conteúdo Protegido</div>
      </AuthGuard>
    );

    expect(mockReplace).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('Conteúdo Protegido')).not.toBeInTheDocument();
  });

  // FT-10: AuthGuard permite acesso com token válido
  it('FT-10: AuthGuard renderiza os componentes filhos normalmente quando há token válido', () => {
    document.cookie = 'creator_auth_token=valid-jwt-token-xyz; path=/';
    (usePathname as jest.Mock).mockReturnValue('/');

    render(
      <AuthGuard>
        <div>Conteúdo Protegido Liberado</div>
      </AuthGuard>
    );

    expect(screen.getByText('Conteúdo Protegido Liberado')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  // FT-11: AuthGuard redireciona de /login para / quando já possui token
  it('FT-11: AuthGuard redireciona de rota pública (/login) para / quando já há token ativo', () => {
    document.cookie = 'creator_auth_token=valid-jwt-token-xyz; path=/';
    (usePathname as jest.Mock).mockReturnValue('/login');

    render(
      <AuthGuard>
        <div>Tela de Login</div>
      </AuthGuard>
    );

    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
