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
    document.cookie = 'creator_auth_token=; path=/; max-age=0';
    document.cookie = 'creator_user_id=; path=/; max-age=0';
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

  it('guarda a página de origem em ?redirect= (codificada) ao mandar para o login', () => {
    (usePathname as jest.Mock).mockReturnValue('/cursos');

    render(
      <AuthGuard>
        <div>Conteúdo Protegido</div>
      </AuthGuard>
    );

    expect(mockReplace).toHaveBeenCalledWith('/login?redirect=%2Fcursos');
  });

  it('já logado em /login, volta para o destino indicado em ?redirect=', () => {
    document.cookie = 'creator_auth_token=valid-jwt-token-xyz; path=/';
    (usePathname as jest.Mock).mockReturnValue('/login');
    window.history.pushState({}, '', '/login?redirect=%2Fconvite%3Ftoken%3Dabc');

    render(
      <AuthGuard>
        <div>Tela de Login</div>
      </AuthGuard>
    );

    expect(mockReplace).toHaveBeenCalledWith('/convite?token=abc');
    window.history.pushState({}, '', '/');
  });

  it('token expirado limpa também o creator_user_id', () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }));
    document.cookie = `creator_auth_token=h.${payload}.s; path=/`;
    document.cookie = 'creator_user_id=42; path=/';
    (usePathname as jest.Mock).mockReturnValue('/');

    render(
      <AuthGuard>
        <div>Conteúdo Protegido</div>
      </AuthGuard>
    );

    expect(document.cookie).not.toContain('creator_auth_token');
    expect(document.cookie).not.toContain('creator_user_id');
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
});
