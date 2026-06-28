/** Tokens visuais compartilhados do motor PDF. */

export const PDF_COLORS = {
  brand: [35, 150, 104] as [number, number, number],
  brandSoft: [247, 250, 248] as [number, number, number],
  blue: [35, 94, 154] as [number, number, number],
  ink: [31, 41, 55] as [number, number, number],
  meta: [107, 114, 128] as [number, number, number],
  muted: [148, 163, 184] as [number, number, number],
  paper: [255, 255, 255] as [number, number, number],
  surface: [249, 250, 251] as [number, number, number],
  hairline: [218, 226, 221] as [number, number, number],
  hairlineSoft: [236, 241, 238] as [number, number, number],
  highlightBg: [242, 250, 246] as [number, number, number],
  evaBlue: [29, 93, 169] as [number, number, number],
  evaGreen: [12, 166, 107] as [number, number, number],
  evaYellow: [225, 194, 0] as [number, number, number],
  evaOrange: [249, 115, 22] as [number, number, number],
  evaRed: [220, 38, 38] as [number, number, number],
} as const;

export type PdfColorPalette = typeof PDF_COLORS;

export const PDF_SPACING = {
  M: 40,
  HEADER_H: 164,
  FOOTER_H: 42,
  BAR_H: 34,
  BAR_GAP: 8,
  BLOCK_GAP: 18,
  BLOCK_GAP_COMPACT: 12,
  BLOCK_GAP_TIGHT: 8,
  BLOCK_GAP_CONTRACT: 24,
  PAD_X: 20,
  PAD_Y: 14,
  LINE_H: 17,
  LABEL_H: 16,
  SIG_CONTRACT_H: 200,
  SIG_DEFAULT_H: 90,
  TOP_AFTER_HEADER: 22,
  TITLE_TO_DIVIDER: 8,
  DIVIDER_TO_CONTENT: 16,
  CARD_RADIUS: 8,
  SECTION_RADIUS: 6,
} as const;

export const PDF_TYPOGRAPHY = {
  docTitle: 18,
  docSubtitle: 8.5,
  blockTitle: 10.5,
  body: 10,
  meta: 7.5,
  label: 7.5,
  sigName: 10,
  sigRole: 9,
  sigMeta: 8,
  headerName: 17,
  headerMeta: 8.5,
  footer: 6.6,
  footerSmall: 6,
} as const;

export const PDF_QR = {
  size: 44,
  marginBottom: 8,
  renderWidth: 200,
  labelOffsetX: 10,
} as const;

export const PDF_LOGO = {
  boxW: 86,
  boxH: 78,
  padding: 14,
  maxCanvasDim: 512,
} as const;

export function hexToRgb(hex?: string | null): [number, number, number] | null {
  const raw = (hex ?? "").trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(raw)) return null;
  return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)];
}

function mixRgb(a: [number, number, number], b: [number, number, number], weight: number): [number, number, number] {
  return a.map((v, i) => Math.round(v * weight + b[i] * (1 - weight))) as [number, number, number];
}

/** Aplica paleta white-label da clínica sobre os tokens mutáveis. */
export function applyClinicPalette(c: { primary_color?: string | null; secondary_color?: string | null }) {
  const primary = hexToRgb(c.primary_color) ?? PDF_COLORS.brand;
  const secondary = hexToRgb(c.secondary_color) ?? primary;
  (PDF_COLORS as { brand: [number, number, number] }).brand = primary;
  (PDF_COLORS as { brandSoft: [number, number, number] }).brandSoft = mixRgb(primary, [255, 255, 255], 0.06);
  (PDF_COLORS as { highlightBg: [number, number, number] }).highlightBg = mixRgb(secondary, [255, 255, 255], 0.08);
  (PDF_COLORS as { hairline: [number, number, number] }).hairline = mixRgb(primary, [255, 255, 255], 0.22);
  (PDF_COLORS as { hairlineSoft: [number, number, number] }).hairlineSoft = mixRgb(primary, [255, 255, 255], 0.11);
}
