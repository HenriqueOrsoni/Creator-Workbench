import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { useAppStore, ProjectCard } from '@/store/useAppStore';
import { CardTaskDialog } from '@/components/shared/CardTaskDialog';
import { LessonMaterialsDialog } from '@/components/shared/LessonMaterialsDialog';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const card: ProjectCard = {
  id: '5', title: 'Projeto', description: '', type: 'PROJECT', sortOrder: 0, progress: 0,
  tasksTotal: 0, tasksDone: 0, tasks: [], reviewStatus: 'NONE', createdAt: '2026-11-01T10:00:00Z',
};

describe('Upload com progresso real', () => {
  it('mostra a porcentagem durante o envio e some ao terminar (sucesso) sem passar de 99% antes', async () => {
    let onProgress: (p: number) => void = () => {};
    let finish: (v: unknown) => void = () => {};
    const uploadMaterial = jest.fn((_id: string, _f: File, cb?: (p: number) => void) => {
      onProgress = cb!;
      return new Promise((resolve) => { finish = resolve; });
    });
    useAppStore.setState({
      activeTeam: { id: '7', name: 'E', role: 'CREATOR', membersCount: 1, createdAt: 'x' },
      activeTeamId: '7',
      uploadMaterial: uploadMaterial as never,
      fetchCardMaterials: jest.fn().mockResolvedValue([]),
    });
    render(<CardTaskDialog card={card} open onOpenChange={() => {}} />);
    await act(async () => { fireEvent.mouseDown(screen.getByRole('tab', { name: /Materiais/ })); fireEvent.click(screen.getByRole('tab', { name: /Materiais/ })); });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => { fireEvent.change(input, { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } }); });
    expect(screen.getByTestId('upload-percent')).toHaveTextContent('0%');

    act(() => onProgress(42));
    expect(screen.getByTestId('upload-percent')).toHaveTextContent('42%');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');

    await act(async () => { finish({ id: '1' }); });
    await waitFor(() => expect(screen.queryByTestId('upload-progress')).not.toBeInTheDocument());
  });

  it('a barra some na hora quando o envio falha (nunca fica em 100%)', async () => {
    let onProgress: (p: number) => void = () => {};
    let fail: () => void = () => {};
    const uploadMaterial = jest.fn((_id: string, _f: File, cb?: (p: number) => void) => {
      onProgress = cb!;
      return new Promise((resolve) => { fail = () => resolve(null); });
    });
    useAppStore.setState({
      activeTeam: { id: '7', name: 'E', role: 'CREATOR', membersCount: 1, createdAt: 'x' },
      activeTeamId: '7',
      uploadMaterial: uploadMaterial as never,
      fetchCardMaterials: jest.fn().mockResolvedValue([]),
    });
    render(<CardTaskDialog card={card} open onOpenChange={() => {}} />);
    await act(async () => { fireEvent.mouseDown(screen.getByRole('tab', { name: /Materiais/ })); fireEvent.click(screen.getByRole('tab', { name: /Materiais/ })); });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => { fireEvent.change(input, { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } }); });
    act(() => onProgress(60));
    expect(screen.getByTestId('upload-percent')).toHaveTextContent('60%');

    await act(async () => { fail(); });
    expect(screen.queryByTestId('upload-progress')).not.toBeInTheDocument();
    expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
  });
});

describe('Materiais da aula: tipo, data e Visualizar', () => {
  it('mostra os metadados e só oferece Visualizar para PDF e imagens', async () => {
    const previewMaterial = jest.fn();
    useAppStore.setState({
      activeTeam: { id: '7', name: 'E', role: 'REVIEWER', membersCount: 1, createdAt: 'x' },
      activeTeamId: '7',
      board: null,
      cardMaterials: {},
      previewMaterial,
      activeCourse: {
        id: 'c1', teamId: '7', title: 'Curso', description: '', createdAt: 'x',
        modules: [{
          id: 'm1', title: 'Mod', sortOrder: 0,
          lessons: [{
            id: 'l1', title: 'Aula', sortOrder: 0,
            materials: [
              { id: '1', cardId: '', fileName: 'guia.pdf', contentType: 'application/pdf', sizeBytes: 2048, createdAt: '2026-11-12T15:00:00Z', uploadedBy: { userId: '3', name: 'Ana' } },
              { id: '2', cardId: '', fileName: 'notas.docx', contentType: 'application/msword', sizeBytes: 100, createdAt: '2026-11-12T15:00:00Z' },
            ],
          }],
        }],
      },
    } as never);
    render(<LessonMaterialsDialog courseId="c1" moduleId="m1" lessonId="l1" onClose={() => {}} />);

    expect(screen.getByText('PDF • 2 KB • Por Ana • 12/11/2026')).toBeInTheDocument();
    expect(screen.queryByLabelText('Visualizar notas.docx')).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByLabelText('Visualizar guia.pdf')); });
    expect(previewMaterial).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
  });
});
