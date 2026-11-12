import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TagManager } from '@/components/shared/TagManager';
import { TeamMembersDialog } from '@/components/shared/TeamMembersDialog';
import { useAppStore } from '@/store/useAppStore';

describe('Gestão de etiquetas (somente Administrador)', () => {
  const mockCreate = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();

  function seed(role: 'ADMIN' | 'CREATOR' | 'REVIEWER') {
    useAppStore.setState({
      activeTeam: { id: 't1', name: 'Equipe', role, membersCount: 1, createdAt: 'x' },
      teamTags: [
        { id: '3', name: 'Tutorial', color: '#2E7D32' },
        { id: '4', name: 'Podcast', color: '#1565C0' },
      ],
      createTeamTag: mockCreate,
      updateTeamTag: mockUpdate,
      deleteTeamTag: mockDelete,
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({ id: '9', name: 'Webinar', color: '#FF5722' });
    mockUpdate.mockResolvedValue(true);
    mockDelete.mockResolvedValue(true);
    seed('ADMIN');
  });

  it('Administrador cria etiqueta com nome e cor #RRGGBB', async () => {
    render(<TagManager />);

    fireEvent.change(screen.getByLabelText('Nome da nova etiqueta'), { target: { value: 'Webinar' } });
    fireEvent.change(screen.getByLabelText('Cor da nova etiqueta'), { target: { value: '#ff5722' } });
    await act(async () => {
      fireEvent.submit(screen.getByLabelText('Nome da nova etiqueta').closest('form')!);
    });

    expect(mockCreate).toHaveBeenCalledWith('Webinar', '#ff5722');
  });

  it('se o servidor recusar a criação (ex.: nome repetido) o nome digitado permanece', async () => {
    mockCreate.mockResolvedValue(null);
    render(<TagManager />);

    fireEvent.change(screen.getByLabelText('Nome da nova etiqueta'), { target: { value: 'Tutorial' } });
    await act(async () => {
      fireEvent.submit(screen.getByLabelText('Nome da nova etiqueta').closest('form')!);
    });

    expect(screen.getByLabelText('Nome da nova etiqueta')).toHaveValue('Tutorial');
  });

  it('renomeia e muda a cor: só envia os campos que mudaram', async () => {
    render(<TagManager />);

    const save = screen.getByLabelText('Salvar etiqueta Tutorial');
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Nome da etiqueta Tutorial'), { target: { value: 'Tutoriais' } });
    expect(save).toBeEnabled();
    await act(async () => {
      fireEvent.click(save);
    });
    expect(mockUpdate).toHaveBeenCalledWith('3', { name: 'Tutoriais' });

    fireEvent.change(screen.getByLabelText('Cor da etiqueta Podcast'), { target: { value: '#112233' } });
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Salvar etiqueta Podcast'));
    });
    expect(mockUpdate).toHaveBeenCalledWith('4', { color: '#112233' });
  });

  it('exclui somente depois da confirmação', async () => {
    render(<TagManager />);

    fireEvent.click(screen.getByLabelText('Excluir etiqueta Podcast'));
    expect(mockDelete).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /confirmar exclusão/i }));
    });
    expect(mockDelete).toHaveBeenCalledWith('4');
  });

  it.each(['CREATOR', 'REVIEWER'] as const)('%s não vê a gestão de etiquetas', (role) => {
    seed(role);
    render(<TagManager />);

    expect(screen.queryByTestId('tag-manager')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nome da nova etiqueta')).not.toBeInTheDocument();
  });

  it('a aba "Etiquetas" da gestão da equipe só aparece para o Administrador', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    useAppStore.setState({ fetchTeamMembers: jest.fn(), fetchTeamInvites: jest.fn(), teamMembers: [], teamInvites: [] });

    seed('ADMIN');
    const { unmount } = render(<TeamMembersDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Etiquetas' })).toBeInTheDocument();
    unmount();

    seed('CREATOR');
    render(<TeamMembersDialog open={true} onOpenChange={() => {}} />);
    expect(screen.queryByRole('tab', { name: 'Etiquetas' })).not.toBeInTheDocument();
  });
});
