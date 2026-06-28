import type jsPDF from "jspdf";
import type { BuildPdfOpts, ClinicData, Professional } from "../../types";
import { cleanText } from "../../text";
import type { DocumentTheme } from "../types";

export type SigLine = {
  text: string;
  bold?: boolean;
  muted?: boolean;
  italic?: boolean;
  size: number;
};

function drawSigCol(
  doc: jsPDF,
  theme: DocumentTheme,
  cx: number,
  topY: number,
  sigW: number,
  signSpace: number,
  colOpts: { label: string; lines: SigLine[] },
) {
  const { colors: C, type: T } = theme;
  const lineY = topY + signSpace;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.6);
  doc.line(cx - sigW / 2, lineY, cx + sigW / 2, lineY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.caption);
  doc.setTextColor(...C.muted);
  doc.text(colOpts.label, cx, lineY + 10, { align: "center" });

  let ly = lineY + 22;
  for (const ln of colOpts.lines) {
    const style = ln.italic ? "italic" : ln.bold ? "bold" : "normal";
    doc.setFont("helvetica", style);
    doc.setFontSize(ln.size);
    doc.setTextColor(...(ln.muted ? C.muted : C.ink));
    doc.text(ln.text, cx, ly, { align: "center" });
    ly += ln.size + 2;
  }
}

function buildRegistry(prof?: Professional | null): string | null {
  if (!prof) return null;
  const num = cleanText(prof.registro ?? "");
  const council = cleanText(prof.conselho ?? "") || "CREFITO";
  if (!num) return null;
  return `${council} nº ${num}`;
}

/** Assinaturas do contrato — contratante, contratada, testemunhas. */
export function drawDsContractSignatures(
  doc: jsPDF,
  theme: DocumentTheme,
  opts: BuildPdfOpts,
  clinic: ClinicData,
  pageW: number,
  margin: number,
  startY: number,
) {
  const { type: T } = theme;
  const colW = (pageW - 2 * margin) / 2;
  const sigW = 200;
  const SPACE_PARTY = 28;
  const SPACE_WITNESS = 40;
  const row1Top = startY;
  const row2Top = row1Top + SPACE_PARTY + 10 + 5 * 11 + 14;

  const prof = opts.professional ?? null;
  const profNome = cleanText(prof?.nome ?? "") || null;
  const profRole = cleanText(prof?.profissao ?? "") || "Fisioterapeuta";
  const profRegistry = buildRegistry(prof);

  const ct = opts.contratante ?? null;
  const ctNome = cleanText(ct?.nome ?? "") || null;
  const ctCpf = cleanText(ct?.cpf ?? "");
  const ctVinculo = cleanText(ct?.vinculo ?? "");
  const isResponsavel = !!ctVinculo && !/próprio paciente/i.test(ctVinculo);
  const ps = opts.patientSnapshot ?? null;
  const psNome = cleanText(ps?.nome ?? "");

  const contratanteLines: SigLine[] = [
    ctNome
      ? { text: ctNome, bold: true, size: T.sigName }
      : { text: "Nome: ____________________", muted: true, size: T.sigRole },
    ctCpf
      ? { text: `CPF ${ctCpf}`, size: T.caption }
      : { text: "CPF: ____________________", muted: true, size: T.caption },
    ...(isResponsavel ? [{ text: ctVinculo, size: T.caption, muted: true } as SigLine] : []),
  ];
  if (isResponsavel && psNome) {
    contratanteLines.push({ text: " ", size: 4 });
    contratanteLines.push({ text: "Paciente beneficiário", size: T.footerSmall, muted: true });
    contratanteLines.push({ text: psNome, size: T.caption, italic: true });
  }
  drawSigCol(doc, theme, margin + colW / 2, row1Top, sigW, SPACE_PARTY, {
    label: "CONTRATANTE",
    lines: contratanteLines,
  });

  const cnpj = cleanText(clinic.cnpj ?? "");
  const razao = cleanText(clinic.razao_social ?? "") || cleanText(clinic.nome_fantasia ?? "");
  drawSigCol(doc, theme, margin + colW + colW / 2, row1Top, sigW, SPACE_PARTY, {
    label: "CONTRATADA",
    lines: [
      profNome
        ? { text: profNome, bold: true, size: T.sigName }
        : { text: "Profissional responsável", muted: true, size: T.sigRole },
      { text: profRole, size: T.sigRole },
      profRegistry
        ? { text: profRegistry, bold: true, size: T.label }
        : { text: "CREFITO: __________________", muted: true, size: T.label },
      ...(razao ? [{ text: razao, size: T.caption, muted: true } as SigLine] : []),
      ...(cnpj ? [{ text: `CNPJ ${cnpj}`, size: T.caption, muted: true } as SigLine] : []),
    ],
  });

  drawSigCol(doc, theme, margin + colW / 2, row2Top, sigW, SPACE_WITNESS, {
    label: "TESTEMUNHA 1",
    lines: [
      { text: "Nome: ____________________", muted: true, size: T.sigRole },
      { text: "CPF: _____________________", muted: true, size: T.caption },
    ],
  });
  drawSigCol(doc, theme, margin + colW + colW / 2, row2Top, sigW, SPACE_WITNESS, {
    label: "TESTEMUNHA 2",
    lines: [
      { text: "Nome: ____________________", muted: true, size: T.sigRole },
      { text: "CPF: _____________________", muted: true, size: T.caption },
    ],
  });
}

/** Área de assinatura com local e data. */
export function drawDsSignatureArea(
  doc: jsPDF,
  theme: DocumentTheme,
  opts: BuildPdfOpts,
  clinic: ClinicData,
  pageW: number,
  pageH: number,
  margin: number,
  contentEndY: number,
) {
  const { colors: C, type: T, space: S } = theme;
  const qrReserve = opts.validationHash ? S.qrSize + S.qrMarginBottom + 8 : 0;
  const maxTop = pageH - S.footerH - 16 - S.sigContractH - qrReserve;
  const top = Math.min(contentEndY + 12, maxTop);

  const dataStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const localStr = [cleanText(clinic.cidade), cleanText(clinic.estado)].filter(Boolean).join("/") || "";
  const localData = localStr ? `${localStr}, ${dataStr}.` : `${dataStr}.`;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(T.caption);
  doc.setTextColor(...C.muted);
  doc.text(localData, pageW - margin, top, { align: "right" });

  drawDsContractSignatures(doc, theme, opts, clinic, pageW, margin, top + 18);
}
