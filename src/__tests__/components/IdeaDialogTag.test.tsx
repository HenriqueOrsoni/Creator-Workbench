import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { IdeaDialog } from '@/components/shared/IdeaDialog';
import { useAppStore, KanbanItem } from '@/store/useAppStore';

describe('IdeaDialog: trocar ou remover a etiqueta do projeto', () => {
  const mockUpdateProject = jest.fn();
  const item: KanbanItem = {
    id: '100',
    title: 'Projeto com etiqueta',
    description: '',
    createdAt: 0,
    targetAudience: 'Iniciantes',
    pedagogicalObjective: 'Entender joins na prática',
    progress: 0,
    tagId: '1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateProject.mockResolvedValue(true);
    useAppStore.setState({
      activeTeam: { id: '7', name: 'Equipe', role: 'ADMIN', membersCount: 1, createdAt: 'x' },
      updateProject: mockUpdateProject,
      teamTags: [
        { id: '1', name: 'Tutorial', color: '#2E7D32' },
        { id: '2', name: 'Podcast', color: '#1565C0' },
      ],
    });
  });

  async function submit() {
    await waitFor(() => expect(screen.getByRole('button', { name: /salvar alterações/i })).toBeEnabled());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));
    });
  }

  it('mostra a etiqueta atual selecionada e não envia tagId se não mudou', async () => {
    render(<IdeaDialog item={item} open={true} onOpenChange={jest.fn()} />);

    expect((screen.getByRole('combobox', { name: 'Etiqueta' }) as HTMLSelectElement).value).toBe('1');
    await submit();

    expect(mockUpdateProject).toHaveBeenCalledWith('100', 'Projeto com etiqueta', 'Iniciantes', 'Entender joins na prática', '', undefined);
  });

  it('troca a etiqueta', async () => {
    render(<IdeaDialog item={item} open={true} onOpenChange={jest.fn()} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Etiqueta' }), { target: { value: '2' } });
    await submit();

    expect(mockUpdateProject).toHaveBeenCalledWith('100', 'Projeto com etiqueta', 'Iniciantes', 'Entender joins na prática', '', '2');
  });

  it('remove a etiqueta ("Sem etiqueta" envia string vazia)', async () => {
    render(<IdeaDialog item={item} open={true} onOpenChange={jest.fn()} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Etiqueta' }), { target: { value: '' } });
    await submit();

    expect(mockUpdateProject).toHaveBeenCalledWith('100', 'Projeto com etiqueta', 'Iniciantes', 'Entender joins na prática', '', '');
  });

  it('se o servidor recusar, o diálogo continua aberto', async () => {
    mockUpdateProject.mockResolvedValue(false);
    const onOpenChange = jest.fn();
    render(<IdeaDialog item={item} open={true} onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Etiqueta' }), { target: { value: '2' } });
    await submit();

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('Revisor não vê o campo de etiqueta', () => {
    useAppStore.setState({ activeTeam: { id: '7', name: 'Equipe', role: 'REVIEWER', membersCount: 1, createdAt: 'x' } });
    render(<IdeaDialog item={item} open={true} onOpenChange={jest.fn()} />);

    expect(screen.queryByRole('combobox', { name: 'Etiqueta' })).not.toBeInTheDocument();
  });
});
