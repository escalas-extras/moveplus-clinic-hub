import { calcAge, fmtDate } from "@/lib/format";
import { formatProfessionalRegistry } from "@/lib/pdf-builders-shared";
import type { PdfBlock } from "@/lib/pdf-engine";
import type { DossierContext } from "./types";
import { hasMeaningfulText } from "../utils";

export function buildIdentificationSection(ctx: DossierContext): PdfBlock {
  const { patient, initialAssessment } = ctx;
  const age = calcAge(patient.data_nascimento as string);
  const prof = initialAssessment?.professionals as {
    nome?: string;
    conselho?: string;
    registro?: string;
    profissao?: string;
    especialidade?: string;
  } | null;

  const patientRows: Array<[string, string]> = [
    ["Nome", String(patient.nome_completo ?? "—")],
    ["Data de nascimento", fmtDate(patient.data_nascimento as string)],
    ["Idade", age != null ? `${age} anos` : "—"],
    ["Sexo", String(patient.sexo ?? "—")],
    ["CPF", String(patient.cpf ?? "—")],
  ];

  if (hasMeaningfulText(patient.rg)) {
    patientRows.push(["RG", String(patient.rg)]);
  }

  patientRows.push(
    ["Telefone", String(patient.telefone ?? "—")],
    ["E-mail", String((patient as { email?: string }).email ?? "—")],
    ["Endereço", String(patient.endereco ?? "—")],
    ["Cidade", [patient.cidade, patient.estado].filter(Boolean).join(" / ") || "—"],
    ["Profissão", String(patient.profissao ?? "—")],
    ["Naturalidade", String(patient.naturalidade ?? "—")],
  );

  const clinicalRows: Array<[string, string]> = [];
  if (initialAssessment) {
    clinicalRows.push(
      ["Profissional responsável", prof?.nome ?? "—"],
      ["Registro profissional", formatProfessionalRegistry(prof ?? null)],
      ["Data da avaliação inicial", fmtDate(initialAssessment.data as string)],
    );
    const specialty = prof?.profissao;
    if (hasMeaningfulText(specialty)) {
      clinicalRows.push(["Especialidade", String(specialty)]);
    }
  }

  const children: PdfBlock["children"] = [
    { kind: "paragraph", label: "Dados do paciente", text: "" },
    { kind: "grid", columns: 2, rows: patientRows },
  ];

  if (clinicalRows.length) {
    children.push(
      { kind: "paragraph", label: "Dados clínicos iniciais", text: "" },
      { kind: "grid", columns: 2, rows: clinicalRows },
    );
  }

  return {
    title: "Identificação",
    includeInIndex: true,
    indexLabel: "Identificação",
    layout: { compact: true, editorial: true },
    children,
  };
}
