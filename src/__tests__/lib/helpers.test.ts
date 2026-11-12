import { parseLocalDate, formatLocalDate, daysUntil, formatDateTime } from '@/lib/dates';
import { getSafeRedirect, buildLoginUrl } from '@/lib/redirect';
import {
  canEditProduction,
  canManageColumns,
  canManageTags,
  canManageTeam,
  canReviewCards,
  formatRole,
} from '@/lib/roles';

describe('datas AAAA-MM-DD sem erro de fuso', () => {
  it('parseLocalDate monta a data no fuso local (dia, mês e ano exatos)', () => {
    const date = parseLocalDate('2026-11-12')!;
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(10);
    expect(date.getDate()).toBe(12);
    expect(date.getHours()).toBe(0);
  });

  it('formatLocalDate mostra o mesmo dia em pt-BR', () => {
    expect(formatLocalDate('2026-01-01')).toBe('01/01/2026');
    expect(formatLocalDate('2026-12-31')).toBe('31/12/2026');
  });

  it('valores vazios ou inválidos viram texto vazio / null', () => {
    expect(parseLocalDate('')).toBeNull();
    expect(parseLocalDate(null)).toBeNull();
    expect(parseLocalDate('abc')).toBeNull();
    expect(formatLocalDate(undefined)).toBe('');
    expect(daysUntil(null)).toBeNull();
  });

  it('daysUntil conta dias corridos a partir de hoje (negativo = vencido)', () => {
    const iso = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    expect(daysUntil(iso(0))).toBe(0);
    expect(daysUntil(iso(3))).toBe(3);
    expect(daysUntil(iso(-2))).toBe(-2);
  });

  it('formatDateTime formata data e hora; entrada inválida vira vazio', () => {
    expect(formatDateTime('2026-11-10T14:00:00Z')).toMatch(/^10\/11\/2026 \d{2}:\d{2}$/);
    expect(formatDateTime('lixo')).toBe('');
    expect(formatDateTime(null)).toBe('');
  });
});

describe('?redirect= do login', () => {
  it('aceita caminho interno já decodificado pelo navegador', () => {
    expect(getSafeRedirect('?redirect=%2Fconvite%3Ftoken%3Dabc')).toBe('/convite?token=abc');
  });

  it('sem parâmetro volta para a raiz', () => {
    expect(getSafeRedirect('')).toBe('/');
    expect(getSafeRedirect('?outro=1')).toBe('/');
  });

  it('rejeita destinos externos e laços para /login e /registrar', () => {
    expect(getSafeRedirect('?redirect=https%3A%2F%2Fmau.com')).toBe('/');
    expect(getSafeRedirect('?redirect=%2F%2Fmau.com')).toBe('/');
    expect(getSafeRedirect('?redirect=%2Flogin')).toBe('/');
    expect(getSafeRedirect('?redirect=%2Fregistrar%3Fx%3D1')).toBe('/');
    expect(getSafeRedirect('?redirect=%2F%5Cmau.com')).toBe('/');
  });

  it('buildLoginUrl codifica a página de origem', () => {
    expect(buildLoginUrl('/')).toBe('/login');
    expect(buildLoginUrl('/cursos', '?aba=1')).toBe('/login?redirect=%2Fcursos%3Faba%3D1');
  });
});

describe('papéis (roles.ts)', () => {
  it('Administrador gerencia equipe, colunas e etiquetas; Criador e Revisor não', () => {
    for (const fn of [canManageTeam, canManageColumns, canManageTags]) {
      expect(fn('ADMIN')).toBe(true);
      expect(fn('CREATOR')).toBe(false);
      expect(fn('REVIEWER')).toBe(false);
    }
  });

  it('Revisor é somente leitura na produção', () => {
    expect(canEditProduction('ADMIN')).toBe(true);
    expect(canEditProduction('CREATOR')).toBe(true);
    expect(canEditProduction('REVIEWER')).toBe(false);
  });

  it('decisão de revisão: Administrador e Revisor', () => {
    expect(canReviewCards('ADMIN')).toBe(true);
    expect(canReviewCards('REVIEWER')).toBe(true);
    expect(canReviewCards('CREATOR')).toBe(false);
  });

  it('formatRole traduz os papéis', () => {
    expect(formatRole('ADMIN')).toBe('Administrador');
    expect(formatRole('CREATOR')).toBe('Criador');
    expect(formatRole('REVIEWER')).toBe('Revisor');
  });
});
