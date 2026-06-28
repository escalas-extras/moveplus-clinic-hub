import type jsPDF from "jspdf";
import { cleanText, wrapText } from "../../text";
import type { DocumentTheme } from "../types";

export type BadgeVariant = "success" | "warning" | "danger" | "neutral";

const BADGE_COLORS: Record<BadgeVariant, { bg: [number, number, number]; fg: [number, number, number] }> = {
  success: { bg: [236, 253, 245], fg: [5, 122, 85] },
  warning: { bg: [255, 251, 235], fg: [180, 83, 9] },
  danger: { bg: [254, 242, 242], fg: [185, 28, 28] },
  neutral: { bg: [241, 245, 249], fg: [100, 116, 139] },
};

export function drawDsBadge(
  doc: jsPDF,
  theme: DocumentTheme,
  text: string,
  x: number,
  y: number,
  variant: BadgeVariant = "neutral",
) {
  const { type: T } = theme;
  const colors = BADGE_COLORS[variant];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.caption);
  const w = doc.getTextWidth(text) + 14;
  doc.setFillColor(...colors.bg);
  doc.roundedRect(x, y - 8, w, 14, 4, 4, "F");
  doc.setTextColor(...colors.fg);
  doc.text(text, x + 7, y + 1);
  return w;
}

export function drawDsDivider(doc: jsPDF, theme: DocumentTheme, x: number, y: number, w: number) {
  doc.setDrawColor(...theme.colors.borderSoft);
  doc.setLineWidth(0.5);
  doc.line(x, y, x + w, y);
}

export function drawDsInfoGrid(
  doc: jsPDF,
  theme: DocumentTheme,
  rows: Array<[string, string]>,
  x: number,
  y: number,
  w: number,
  cols = 2,
) {
  const { colors: C, type: T, space: S } = theme;
  const colW = w / cols;
  let cy = y;
  let maxRowH = 0;

  for (let i = 0; i < rows.length; i++) {
    const [label, value] = rows[i];
    const col = i % cols;
    const cx = x + col * colW;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(T.caption);
    doc.setTextColor(...C.muted);
    doc.text(label.toUpperCase(), cx, cy);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(T.body);
    doc.setTextColor(...C.ink);
    const lines = wrapText(doc, cleanText(value), colW - 8);
    doc.text(lines, cx, cy + 11);

    const rowH = 11 + lines.length * S.lineH;
    maxRowH = Math.max(maxRowH, rowH);

    if (col === cols - 1 || i === rows.length - 1) {
      cy += maxRowH + 8;
      maxRowH = 0;
    }
  }

  return cy - y;
}
