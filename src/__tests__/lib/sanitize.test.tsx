import React from 'react';
import { render } from '@testing-library/react';
import { sanitizeHtml } from '@/lib/sanitize';

function Preview({ html }: { html: string }) {
  return <div data-testid="preview" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}

describe('sanitizeHtml (XSS no HTML do roteiro)', () => {
  it('img com onerror é removida e o script não executa', () => {
    (window as unknown as { __xss: number }).__xss = 0;
    const { getByTestId } = render(
      <Preview html={'<p>Texto</p><img src="x" onerror="window.__xss=1"><script>window.__xss=2</script>'} />
    );
    const root = getByTestId('preview');
    expect(root.textContent).toBe('Texto');
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('script')).toBeNull();
    expect(root.innerHTML).not.toMatch(/onerror/i);
    expect((window as unknown as { __xss: number }).__xss).toBe(0);
  });

  it('mantém as tags do editor (TipTap)', () => {
    const html = '<h2>Título</h2><p><strong>negrito</strong> <em>itálico</em> <code>x</code></p><ul><li>um</li></ul><blockquote>cit</blockquote><pre><code>a</code></pre>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('links seguros ficam e javascript: é removido; iframe e eventos saem', () => {
    expect(sanitizeHtml('<a href="https://exemplo.com" target="_blank" rel="noopener">ok</a>')).toContain('href="https://exemplo.com"');
    expect(sanitizeHtml('<a href="javascript:alert(1)">mau</a>')).not.toMatch(/javascript:/i);
    expect(sanitizeHtml('<iframe src="https://evil.test"></iframe><p onclick="x()">oi</p>')).toBe('<p>oi</p>');
  });

  it('vazio ou nulo devolve texto vazio', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });
});
