import type jsPDF from "jspdf";
import type { ClinicData } from "./types";
import { PDF_COLORS as C } from "./tokens";
import { cleanText } from "./text";

export type IconKind =
  | "calendar"
  | "file"
  | "heart"
  | "mail"
  | "phone"
  | "pin"
  | "shield"
  | "stethoscope"
  | "target"
  | "user";

export function drawHeaderMeta(
  doc: jsPDF,
  icon: IconKind,
  label: string,
  value: string,
  x: number,
  y: number,
  maxW: number,
) {
  drawMiniIcon(doc, icon, x, y - 8, 7, C.brand);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.meta);
  doc.text(label, x + 11, y - 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(...C.ink);
  const lines = doc.splitTextToSize(value, maxW);
  doc.text(lines[0] ?? value, x + 11, y + 8);
}

export function drawMiniIcon(
  doc: jsPDF,
  kind: IconKind,
  x: number,
  y: number,
  size: number,
  color: readonly [number, number, number] = C.brand,
) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  doc.setDrawColor(...color);
  doc.setFillColor(...color);
  doc.setLineWidth(0.75);
  if (kind === "user") {
    doc.circle(cx, y + size * 0.34, size * 0.18, "S");
    doc.roundedRect(x + size * 0.22, y + size * 0.58, size * 0.56, size * 0.28, 2, 2, "S");
  } else if (kind === "phone") {
    doc.roundedRect(x + size * 0.28, y + size * 0.1, size * 0.44, size * 0.8, 2, 2, "S");
    doc.circle(cx, y + size * 0.78, 0.8, "F");
  } else if (kind === "mail") {
    doc.roundedRect(x + size * 0.1, y + size * 0.22, size * 0.8, size * 0.58, 1.5, 1.5, "S");
    doc.line(x + size * 0.12, y + size * 0.26, cx, cy + size * 0.12);
    doc.line(x + size * 0.88, y + size * 0.26, cx, cy + size * 0.12);
  } else if (kind === "pin") {
    doc.circle(cx, y + size * 0.38, size * 0.22, "S");
    doc.line(cx, y + size * 0.6, cx, y + size * 0.9);
  } else if (kind === "calendar") {
    doc.roundedRect(x + size * 0.12, y + size * 0.18, size * 0.76, size * 0.68, 1.5, 1.5, "S");
    doc.line(x + size * 0.12, y + size * 0.38, x + size * 0.88, y + size * 0.38);
  } else if (kind === "heart") {
    doc.circle(x + size * 0.36, y + size * 0.36, size * 0.18, "S");
    doc.circle(x + size * 0.64, y + size * 0.36, size * 0.18, "S");
    doc.line(x + size * 0.2, y + size * 0.46, cx, y + size * 0.82);
    doc.line(x + size * 0.8, y + size * 0.46, cx, y + size * 0.82);
  } else if (kind === "target") {
    doc.circle(cx, cy, size * 0.36, "S");
    doc.circle(cx, cy, size * 0.16, "S");
  } else if (kind === "shield") {
    doc.roundedRect(x + size * 0.22, y + size * 0.12, size * 0.56, size * 0.7, 2, 2, "S");
    doc.line(cx, y + size * 0.82, x + size * 0.22, y + size * 0.5);
    doc.line(cx, y + size * 0.82, x + size * 0.78, y + size * 0.5);
  } else if (kind === "stethoscope") {
    doc.circle(x + size * 0.74, y + size * 0.68, size * 0.14, "S");
    doc.line(x + size * 0.34, y + size * 0.18, x + size * 0.34, y + size * 0.48);
    doc.line(x + size * 0.34, y + size * 0.48, x + size * 0.62, y + size * 0.48);
    doc.line(x + size * 0.62, y + size * 0.48, x + size * 0.62, y + size * 0.22);
  } else {
    doc.roundedRect(x + size * 0.2, y + size * 0.12, size * 0.6, size * 0.76, 1.5, 1.5, "S");
    doc.line(x + size * 0.32, y + size * 0.36, x + size * 0.68, y + size * 0.36);
    doc.line(x + size * 0.32, y + size * 0.52, x + size * 0.68, y + size * 0.52);
  }
}

export function drawMonogram(doc: jsPDF, clinic: ClinicData, x: number, y: number, size: number) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  doc.setFillColor(...C.brand);
  doc.circle(cx, cy, size / 2 - 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  const name = cleanText(clinic.nome_fantasia) || "FisioOS";
  const monogram = name.charAt(0).toUpperCase() || "F";
  doc.text(monogram, cx, cy + 10, { align: "center" });
}

export function fieldIconFor(label: string): IconKind {
  if (/nome|paciente|profissional/i.test(label)) return "user";
  if (/telefone/i.test(label)) return "phone";
  if (/data|nascimento/i.test(label)) return "calendar";
  if (/sexo|civil/i.test(label)) return "heart";
  if (/profiss/i.test(label)) return "file";
  if (/natural|endere|cidade/i.test(label)) return "pin";
  return "file";
}
