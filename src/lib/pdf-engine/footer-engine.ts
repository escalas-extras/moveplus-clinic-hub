import type jsPDF from "jspdf";
import QRCode from "qrcode";
import type { ClinicData } from "./types";
import { PDF_COLORS as C, PDF_QR, PDF_SPACING as S, PDF_TYPOGRAPHY as T } from "./tokens";
import { cleanText } from "./text";

export type FooterEngineOptions = {
  page: number;
  pageCount: number;
  validationHash?: string | null;
  validationUrlBase?: string;
  documentVersion?: string | null;
  isContract?: boolean;
};

function nowLabel(): string {
  return new Date().toLocaleString("pt-BR");
}

export function drawDocumentFooter(
  doc: jsPDF,
  clinic: ClinicData,
  pageW: number,
  pageH: number,
  M: number,
  opts: FooterEngineOptions,
) {
  const fy = pageH - S.FOOTER_H + 4;
  doc.setDrawColor(...C.hairline);
  doc.setLineWidth(0.3);
  doc.line(M, fy, pageW - M, fy);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(T.footer);
  doc.setTextColor(...C.meta);

  const issued = `Emitido em ${nowLabel()}`;
  const name = cleanText(clinic.nome_fantasia ?? "") || "FisioOS";
  const cityState = [cleanText(clinic.cidade ?? ""), cleanText(clinic.estado ?? "")].filter(Boolean).join("/");
  const footerName = cleanText(clinic.rodape_institucional ?? "") || [name, cityState].filter(Boolean).join(" · ");

  doc.text(issued, M, fy + 10);
  doc.text(footerName, M, fy + 20);

  const rightParts = [`Página ${opts.page} de ${opts.pageCount}`];
  if (opts.documentVersion) rightParts.unshift(`v${opts.documentVersion}`);
  doc.text(rightParts.join(" · "), pageW - M, fy + 10, { align: "right" });

  if (opts.validationHash && opts.page === opts.pageCount) {
    const short = opts.validationHash.slice(0, 16);
    doc.setFontSize(T.footerSmall);
    doc.text(`Verificação: ${short}…`, pageW - M, fy + 20, { align: "right" });
  }
}

export async function drawValidationQr(
  doc: jsPDF,
  hash: string,
  pageW: number,
  pageH: number,
  base?: string,
): Promise<boolean> {
  try {
    const origin = base || (typeof window !== "undefined" ? window.location.origin : "https://fisioos.app");
    const url = `${origin}/validar/${hash}`;
    const dataUrl = await QRCode.toDataURL(url, { margin: 0, width: PDF_QR.renderWidth });
    const size = PDF_QR.size;
    const x = pageW / 2 - size / 2;
    const y = pageH - S.FOOTER_H - size - PDF_QR.marginBottom;
    doc.addImage(dataUrl, "PNG", x, y, size, size);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(T.footerSmall);
    doc.setTextColor(...C.meta);
    doc.text("Verifique a autenticidade", x + size + PDF_QR.labelOffsetX, y + 14);
    doc.text("deste documento", x + size + PDF_QR.labelOffsetX, y + 24);
    return true;
  } catch {
    return false;
  }
}

export function drawLegacyFooter(
  doc: jsPDF,
  clinic: ClinicData,
  pageW: number,
  pageH: number,
  M: number,
  page: number,
  pageCount: number,
) {
  drawDocumentFooter(doc, clinic, pageW, pageH, M, { page, pageCount });
}
