/**
 * Telas cujo backend ainda não existe ficam escondidas.
 * Cada marco liga as suas telas trocando a flag correspondente para `true`.
 * Com a flag desligada, a tela não aparece e a rota não é chamada.
 */
export const FEATURES = {
  /** Aba Materiais do card e vínculo de material com aula. */
  materials: true,
  /** Aba Resumo IA do card. */
  summary: true,
  /** Aba Revisão do card (decisão do revisor). */
  review: true,
  /** Convites de equipe (aba e ações). */
  invites: true,
  /** Publicar/despublicar curso e verificação de publicação. */
  coursePublish: true,
  /** Exportar curso em CSV. */
  courseCsv: true,
  /** Editar curso, renomear módulo e reordenar módulos e aulas. */
  courseEdit: true,
  /** Renomear e excluir equipe. */
  teamManage: true,
  /** Troca de e-mail e de senha nas configurações. */
  accountSecurity: true,
  /** Sino e painel de alertas. */
  alerts: true,
} as const;

export type FeatureName = keyof typeof FEATURES;
