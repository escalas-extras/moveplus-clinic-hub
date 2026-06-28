/**
 * Sprint D4 — escala tipográfica editorial do dossiê.
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
  blockGap: 4,
  cardPad: 8,
  cardGap: 5,
} as const;
