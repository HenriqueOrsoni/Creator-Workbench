import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserSettingsDialog } from '@/components/shared/UserSettingsDialog';
import * as apiModule from '@/lib/api';

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiRequest: jest.fn(),
  getCookie: jest.fn(),
  deleteCookie: jest.fn(),
}));

describe('TF-08 & FE-35 - UserSettingsDialog Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiModule.getCookie as jest.Mock).mockReturnValue('123');
    (apiModule.apiRequest as jest.Mock).mockImplementation((method, path) => {
      if (method === 'GET' && path.includes('/api/v1/users/123')) {
        return Promise.resolve({
          id: 123,
          name: 'Henrique Orsoni',
          email: 'henrique@example.com',
        });
      }
      return Promise.resolve({});
    });
  });

  it('carrega e preenche os dados do usuário ao abrir o diálogo', async () => {
    render(<UserSettingsDialog open={true} onOpenChange={jest.fn()} />);

    await waitFor(() => {
      expect(apiModule.apiRequest).toHaveBeenCalledWith('GET', '/api/v1/users/123');
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Henrique Orsoni')).toBeInTheDocument();
      expect(screen.getByDisplayValue('henrique@example.com')).toBeInTheDocument();
    });
  });

  it('permite atualizar perfil enviando os dados validados', async () => {
    render(<UserSettingsDialog open={true} onOpenChange={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Henrique Orsoni')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Henrique Orsoni');
    fireEvent.change(nameInput, { target: { value: 'Henrique Atualizado' } });

    const saveBtn = screen.getByRole('button', { name: /salvar alterações/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiModule.apiRequest).toHaveBeenCalledWith('PUT', '/api/v1/users/123', expect.objectContaining({
        name: 'Henrique Atualizado',
        email: 'henrique@example.com',
      }));
    });
  });

  it('exibe modal de confirmação LGPD antes de excluir a conta', async () => {
    render(<UserSettingsDialog open={true} onOpenChange={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Henrique Orsoni')).toBeInTheDocument();
    });

    const deleteAccountBtn = screen.getByRole('button', { name: /excluir conta do operador/i });
    fireEvent.click(deleteAccountBtn);

    expect(screen.getByText(/esta ação é/i)).toBeInTheDocument();
  });
});
