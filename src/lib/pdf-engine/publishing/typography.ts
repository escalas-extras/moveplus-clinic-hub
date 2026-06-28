/**
 * Sprint D4 + D5 — escala tipográfica e layout editorial do dossiê.
 * Hierarquia: documento → seção → subtítulo → label → valor → corpo.
 */

export const PUB_TYPE = {
  coverTitle: 22,
  coverPatient: 16,
  coverMeta: 8.5,
  headerPatient: 8.5,
  headerDoc: 7,
  headerMeta: 6.5,
  sectionTitle: 10,
  subtitle: 8.5,
  label: 6.5,
  value: 10.5,
  valueLg: 18,
  body: 9,
  meta: 7,
  caption: 6.5,
} as const;

export const PUB_SPACE = {
  titleBottom: 6,
  sectionGap: 5,
  blockGap: 5,
  cardPad: 8,
  cardGap: 5,
  contentPadX: 20,
} as const;

/** Dimensões fixas — alinhadas entre measure, compose e render. */
export const PUB_LAYOUT = {
  lineH: 13,
  titleH: 20,
  labelH: 12,
  cardRadius: 5,
  panelRadius: 6,
  badgeRadius: 4,
  documentCardH: 56,
  dashboardCellH: 46,
  gridCellH: 34,
  evaH: 56,
  compareRowH: 38,
  timelineItemH: 26,
  signatureMinH: 68,
  /** Mínimo de linhas de conteúdo após título de seção (evita título órfão). */
  titleOrphanLines: 2,
} as const;
