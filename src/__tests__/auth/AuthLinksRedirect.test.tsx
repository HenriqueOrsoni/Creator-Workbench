import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import RegisterPage from '@/app/registrar/page';
import { withRedirect } from '@/lib/redirect';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/lib/api', () => ({ apiRequest: jest.fn(), setCookie: jest.fn(), getCookie: jest.fn() }));
jest.mock('@/components/shared/ThemeToggle', () => ({ ThemeToggle: () => null }));
jest.mock('@/components/shared/PasswordRecoveryDialog', () => ({ PasswordRecoveryDialog: () => null }));

const back = encodeURIComponent('/convite?token=abc');

function setSearch(search: string) {
  window.history.replaceState(null, '', `/x${search}`);
}

afterEach(() => window.history.replaceState(null, '', '/'));

describe('links entre login e registrar mantêm o ?redirect=', () => {
  it('registrar: "Iniciar Sessão" volta para o login com o mesmo redirect', async () => {
    setSearch(`?redirect=${back}`);
    render(<RegisterPage />);
    const link = screen.getByRole('link', { name: /iniciar sessão/i });
    await waitFor(() => expect(link).toHaveAttribute('href', `/login?redirect=${back}`));
  });

  it('login: link de cadastro leva ao registrar com o mesmo redirect', async () => {
    setSearch(`?redirect=${back}`);
    render(<LoginPage />);
    const link = document.querySelector('a[href^="/registrar"]') as HTMLAnchorElement;
    await waitFor(() => expect(link.getAttribute('href')).toBe(`/registrar?redirect=${back}`));
  });

  it('sem redirect os links continuam simples', async () => {
    setSearch('');
    render(<RegisterPage />);
    expect(screen.getByRole('link', { name: /iniciar sessão/i })).toHaveAttribute('href', '/login');
  });

  it('redirect inseguro não é repassado', () => {
    expect(withRedirect('/login', '?redirect=%2F%09%2Fevil.com')).toBe('/login');
    expect(withRedirect('/registrar', '?redirect=https%3A%2F%2Fevil.com')).toBe('/registrar');
  });
});
