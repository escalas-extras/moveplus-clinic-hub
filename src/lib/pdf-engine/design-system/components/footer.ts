import type jsPDF from "jspdf";
import QRCode from "qrcode";
import type { ClinicData } from "../../types";
import { cleanText } from "../../text";
import type { DocumentTheme } from "../types";

export type DsFooterOpts = {
  page: number;
  pageCount: number;
  validationHash?: string | null;
  validationUrlBase?: string;
  documentVersion?: string | null;
};

function nowLabel() {
  return new Date().toLocaleString("pt-BR");
}

/** Rodapé institucional — confidencialidade, paginação, validação. */
export function drawDsFooter(
  doc: jsPDF,
  theme: DocumentTheme,
  clinic: ClinicData,
  pageW: number,
  pageH: number,
  opts: DsFooterOpts,
) {
  const M = theme.space.margin;
  const { colors: C, type: T, space: S } = theme;
  const fy = pageH - S.footerH + 6;

  doc.setDrawColor(...C.borderSoft);
  doc.setLineWidth(0.4);
  doc.line(M, fy, pageW - M, fy);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(T.footer);
  doc.setTextColor(...C.muted);

  const name = cleanText(clinic.nome_fantasia ?? "") || "FisioOS";
  doc.text(`Documento confidencial · ${name}`, M, fy + 10);
  doc.text(`Emitido em ${nowLabel()}`, M, fy + 20);

  const right = [`Página ${opts.page} de ${opts.pageCount}`];
  if (opts.documentVersion) right.unshift(`Rev. ${opts.documentVersion}`);
  doc.text(right.join(" · "), pageW - M, fy + 10, { align: "right" });

  if (opts.validationHash && opts.page === opts.pageCount) {
    const short = opts.validationHash.slice(0, 12);
    doc.setFontSize(T.footerSmall);
    doc.text(`Autenticidade verificável · Ref. ${short}…`, pageW - M, fy + 20, { align: "right" });
  }
}

export async function drawDsValidationQr(
  doc: jsPDF,
  theme: DocumentTheme,
  hash: string,
  pageW: number,
  pageH: number,
  base?: string,
): Promise<boolean> {
  try {
    const M = theme.space.margin;
    const { space: S } = theme;
    const origin = base || (typeof window !== "undefined" ? window.location.origin : "https://fisioos.app");
    const url = `${origin}/validar/${hash}`;
    const dataUrl = await QRCode.toDataURL(url, { margin: 0, width: 180 });
    const size = S.qrSize;
    const x = M;
    const y = pageH - S.footerH - size - S.qrMarginBottom - 8;
    doc.addImage(dataUrl, "PNG", x, y, size, size);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(theme.type.footerSmall);
    doc.setTextColor(...theme.colors.muted);
    doc.text("Verifique a autenticidade", x, y - 3);
    doc.text("fisioos.app/validar", x, y + size + 8);
    return true;
  } catch {
    return false;
  }
}
