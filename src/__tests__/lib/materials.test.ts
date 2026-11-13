import { isPreviewable, materialTypeLabel, formatFileSize, formatUploadDate, materialMeta } from '@/lib/materials';

const base = { id: '1', cardId: '5', createdAt: '2026-11-12T15:00:00Z', sizeBytes: 2048 };

describe('lib/materials', () => {
  it.each([
    ['a.pdf', 'application/pdf', true],
    ['a.png', 'image/png', true],
    ['a.jpg', 'image/jpeg', true],
    ['a.webp', 'image/webp', true],
    ['a.gif', 'image/gif', true],
    ['a.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', false],
    ['a.txt', 'text/plain', false],
    ['a.xlsx', 'application/vnd.ms-excel', false],
    ['a.pdf', '', true],
    ['a.svg', 'image/svg+xml', false],
  ])('isPreviewable(%s, %s) = %s', (fileName, contentType, expected) => {
    expect(isPreviewable({ fileName, contentType })).toBe(expected);
  });

  it('tipo: extensão em maiúsculas ou subtipo do contentType', () => {
    expect(materialTypeLabel({ fileName: 'guia.pdf', contentType: 'application/pdf' })).toBe('PDF');
    expect(materialTypeLabel({ fileName: 'semextensao', contentType: 'image/png' })).toBe('PNG');
    expect(materialTypeLabel({ fileName: 'semextensao', contentType: '' })).toBe('Arquivo');
  });

  it('tamanho legível em B, KB e MB', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(5 * 1024 * 1024 + 512 * 1024)).toBe('5,5 MB');
  });

  it('data em pt-BR e metadados completos', () => {
    expect(formatUploadDate('2026-11-12T15:00:00Z')).toBe('12/11/2026');
    expect(formatUploadDate('x')).toBe('');
    const meta = materialMeta({ ...base, fileName: 'guia.pdf', contentType: 'application/pdf', uploadedBy: { userId: '3', name: 'Ana' } });
    expect(meta).toBe('PDF • 2 KB • Por Ana • 12/11/2026');
  });
});
