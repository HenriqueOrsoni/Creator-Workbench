import React from 'react';
import { render, screen } from '@testing-library/react';
import NotFound from '@/app/not-found';

describe('app/not-found', () => {
  it('mostra a página 404 em português com link de volta', () => {
    render(<NotFound />);

    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao painel' })).toHaveAttribute('href', '/');
  });
});
