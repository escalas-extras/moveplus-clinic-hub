import type jsPDF from "jspdf";
import { cleanText, wrapText } from "../../text";
import type { DocumentTheme } from "../types";

export type SectionCardMeasure = {
  title: string;
  body: string;
  h: number;
};

export function measureSectionCard(
  doc: jsPDF,
  theme: DocumentTheme,
  title: string,
  body: string,
  contentW: number,
): SectionCardMeasure {
  const { type: T, space: S } = theme;
  const innerW = contentW - S.sectionPadX * 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(T.body);
  const lines = wrapText(doc, cleanText(body), innerW);
  const bodyH = lines.length * S.lineH;
  const h = S.sectionPadY + 12 + bodyH + S.sectionPadY;
  return { title, body, h: Math.max(h, 48) };
}

/** SectionCard — título, faixa superior, corpo com padding e bordas suaves. */
export function drawSectionCard(
  doc: jsPDF,
  theme: DocumentTheme,
  title: string,
  body: string,
  x: number,
  y: number,
  w: number,
) {
  const { colors: C, type: T, space: S } = theme;
  const innerW = w - S.sectionPadX * 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(T.body);
  const lines = wrapText(doc, cleanText(body), innerW);
  const cardH = S.sectionPadY + 12 + lines.length * S.lineH + S.sectionPadY;

  doc.setFillColor(...C.paper);
  doc.setDrawColor(...C.borderSoft);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, cardH, S.sectionRadius, S.sectionRadius, "FD");

  doc.setFillColor(...C.primary);
  doc.roundedRect(x, y, w, 4, S.sectionRadius, S.sectionRadius, "F");

  const sectionNum = title.match(/^\s*(\d+)/)?.[1];
  const sectionLabel = title.replace(/^\s*\d+[\.\s-]*/, "").trim() || title;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.sectionTitle);
  doc.setTextColor(...C.primary);
  const titleX = x + S.sectionPadX + (sectionNum ? 22 : 0);
  doc.text(sectionLabel.toUpperCase(), titleX, y + S.sectionPadY + 10);

  if (sectionNum) {
    doc.setFillColor(...C.primary);
    doc.circle(x + S.sectionPadX + 8, y + S.sectionPadY + 6, 8, "F");
    doc.setFontSize(T.caption);
    doc.setTextColor(255, 255, 255);
    doc.text(sectionNum, x + S.sectionPadX + 8, y + S.sectionPadY + 9, { align: "center" });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(T.body);
  doc.setTextColor(...C.ink);
  let ly = y + S.sectionPadY + 24;
  for (const line of lines) {
    doc.text(line, x + S.sectionPadX, ly);
    ly += S.lineH;
  }

  return cardH;
}
