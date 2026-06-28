/**
 * Sprint G2.6 — Receita por profissional (financial_entries receivable).
 */

import { DELINQUENCY_ORIGIN_LABELS } from "./constants";
import { downloadCashFlowCsv } from "./cash-flow-helpers";
import { inferReceivableOrigin, delinquencyOriginLabel } from "./delinquency-helpers";
import type { PaymentStatus } from "./types";
import type { ReceivableRow } from "./receivable-helpers";

export type ProfessionalRevenueOrigin = keyof typeof DELINQUENCY_ORIGIN_LABELS;

export type ProfessionalRevenueStatusFilter = PaymentStatus | "all";

export type ProfessionalRevenueFilters = {
  from: string;
  to: string;
  professionalId: string;
  categoryId: string;
  costCenterId: string;
  origin: ProfessionalRevenueOrigin | "all";
  status: ProfessionalRevenueStatusFilter;
};

export type ProfessionalRevenueRow = ReceivableRow;

export const PROFESSIONAL_REVENUE_UNASSIGNED_ID = "__unassigned__" as const;

export const PROFESSIONAL_REVENUE_UNASSIGNED_LABEL = "Sem profissional vinculado";

export type ProfessionalRevenueGroup = {
  professionalId: string;
  nome: string;
  receitaRealizada: number;
  receitaPrevista: number;
  totalGeral: number;
  qtdRecebidos: number;
  qtdAbertos: number;
  ticketMedio: number;
  participacaoPercentual: number;
  entries: ProfessionalRevenueRow[];
};

export type ProfessionalRevenueSummary = {
  receitaRealizadaTotal: number;
  receitaPrevistaTotal: number;
  qtdRecebidos: number;
  qtdAbertos: number;
  maiorReceitaNome: string | null;
  maiorReceitaValor: number;
  ticketMedioGlobal: number;
};

const SELECT_ALL = "all";

function inPeriod(isoDate: string, from: string, to: string): boolean {
  return isoDate >= from && isoDate <= to;
}

export function revenuePeriodDate(row: Pick<ProfessionalRevenueRow, "status" | "data_recebimento" | "data_vencimento" | "data">): string {
  if (row.status === "pago") return row.data_recebimento ?? row.data;
  return row.data_vencimento ?? row.data;
}

export function professionalRevenueKey(row: Pick<ProfessionalRevenueRow, "professional_id">): string {
  return row.professional_id ?? PROFESSIONAL_REVENUE_UNASSIGNED_ID;
}

export function professionalRevenueName(row: ProfessionalRevenueRow): string {
  if (!row.professional_id) return PROFESSIONAL_REVENUE_UNASSIGNED_LABEL;
  return row.professionals?.nome ?? PROFESSIONAL_REVENUE_UNASSIGNED_LABEL;
}

export function filterProfessionalRevenueRows(
  rows: ProfessionalRevenueRow[],
  filters: ProfessionalRevenueFilters,
): ProfessionalRevenueRow[] {
  return rows.filter((row) => {
    if (row.status === "cancelado") return false;

    const periodDate = revenuePeriodDate(row);
    if (!inPeriod(periodDate, filters.from, filters.to)) return false;

    if (filters.status !== SELECT_ALL && row.status !== filters.status) return false;

    const profKey = professionalRevenueKey(row);
    if (filters.professionalId !== SELECT_ALL && profKey !== filters.professionalId) return false;

    if (filters.categoryId !== SELECT_ALL && row.category_id !== filters.categoryId) return false;
    if (filters.costCenterId !== SELECT_ALL && row.cost_center_id !== filters.costCenterId) return false;

    const origin = inferReceivableOrigin(row);
    if (filters.origin !== SELECT_ALL && origin !== filters.origin) return false;

    return true;
  });
}

export function groupProfessionalRevenue(rows: ProfessionalRevenueRow[]): ProfessionalRevenueGroup[] {
  const map = new Map<string, ProfessionalRevenueGroup>();

  for (const row of rows) {
    const key = professionalRevenueKey(row);
    const nome = professionalRevenueName(row);
    const valor = Number(row.valor ?? 0);

    let group = map.get(key);
    if (!group) {
      group = {
        professionalId: key,
        nome,
        receitaRealizada: 0,
        receitaPrevista: 0,
        totalGeral: 0,
        qtdRecebidos: 0,
        qtdAbertos: 0,
        ticketMedio: 0,
        participacaoPercentual: 0,
        entries: [],
      };
      map.set(key, group);
    }

    group.entries.push(row);
    if (row.status === "pago") {
      group.receitaRealizada += valor;
      group.qtdRecebidos += 1;
    } else if (row.status === "pendente") {
      group.receitaPrevista += valor;
      group.qtdAbertos += 1;
    }
  }

  const groups = [...map.values()];
  const grandTotal = groups.reduce((s, g) => s + g.receitaRealizada + g.receitaPrevista, 0);

  for (const group of groups) {
    group.totalGeral = group.receitaRealizada + group.receitaPrevista;
    const qtd = group.qtdRecebidos + group.qtdAbertos;
    group.ticketMedio = qtd > 0 ? group.totalGeral / qtd : 0;
    group.participacaoPercentual = grandTotal > 0 ? (group.totalGeral / grandTotal) * 100 : 0;
  }

  return groups.sort((a, b) => {
    if (a.professionalId === PROFESSIONAL_REVENUE_UNASSIGNED_ID) return 1;
    if (b.professionalId === PROFESSIONAL_REVENUE_UNASSIGNED_ID) return -1;
    return b.totalGeral - a.totalGeral;
  });
}

export function computeProfessionalRevenueSummary(
  rows: ProfessionalRevenueRow[],
  groups: ProfessionalRevenueGroup[],
): ProfessionalRevenueSummary {
  let receitaRealizadaTotal = 0;
  let receitaPrevistaTotal = 0;
  let qtdRecebidos = 0;
  let qtdAbertos = 0;

  for (const row of rows) {
    const valor = Number(row.valor ?? 0);
    if (row.status === "pago") {
      receitaRealizadaTotal += valor;
      qtdRecebidos += 1;
    } else if (row.status === "pendente") {
      receitaPrevistaTotal += valor;
      qtdAbertos += 1;
    }
  }

  let maiorReceitaNome: string | null = null;
  let maiorReceitaValor = 0;
  for (const group of groups) {
    if (group.professionalId === PROFESSIONAL_REVENUE_UNASSIGNED_ID) continue;
    if (group.totalGeral > maiorReceitaValor) {
      maiorReceitaValor = group.totalGeral;
      maiorReceitaNome = group.nome;
    }
  }

  const qtdTotal = qtdRecebidos + qtdAbertos;
  const ticketMedioGlobal = qtdTotal > 0 ? (receitaRealizadaTotal + receitaPrevistaTotal) / qtdTotal : 0;

  return {
    receitaRealizadaTotal,
    receitaPrevistaTotal,
    qtdRecebidos,
    qtdAbertos,
    maiorReceitaNome,
    maiorReceitaValor,
    ticketMedioGlobal,
  };
}

export function defaultProfessionalRevenueFilters(): ProfessionalRevenueFilters {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    from: firstDay.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
    professionalId: SELECT_ALL,
    categoryId: SELECT_ALL,
    costCenterId: SELECT_ALL,
    origin: SELECT_ALL,
    status: SELECT_ALL,
  };
}

export function professionalRevenueFiltersKey(filters: ProfessionalRevenueFilters): string {
  return JSON.stringify(filters);
}

export function professionalRevenueOriginLabel(row: ProfessionalRevenueRow): string {
  return delinquencyOriginLabel(row);
}

export function formatParticipacaoPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function toProfessionalRevenueCsv(groups: ProfessionalRevenueGroup[]): string {
  const header = [
    "Profissional",
    "Receita realizada",
    "Receita prevista",
    "Total geral",
    "Qtd. recebidos",
    "Qtd. em aberto",
    "Ticket médio",
    "Participação %",
  ]
    .map((h) => `"${h}"`)
    .join(";");

  const body = groups
    .map((g) =>
      [
        g.nome,
        String(g.receitaRealizada),
        String(g.receitaPrevista),
        String(g.totalGeral),
        String(g.qtdRecebidos),
        String(g.qtdAbertos),
        String(g.ticketMedio),
        g.participacaoPercentual.toFixed(1),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";"),
    )
    .join("\n");

  return `${header}\n${body}`;
}

export function toProfessionalRevenueDetailCsv(group: ProfessionalRevenueGroup): string {
  const header = [
    "Status",
    "Paciente",
    "Documento",
    "Vencimento",
    "Recebimento",
    "Valor",
    "Origem",
  ]
    .map((h) => `"${h}"`)
    .join(";");

  const body = group.entries
    .map((row) =>
      [
        row.status === "pago" ? "Recebido" : "Em aberto",
        row.patients?.nome_completo ?? "",
        row.patients?.cpf ?? row.documento ?? "",
        row.data_vencimento ?? "",
        row.data_recebimento ?? "",
        String(row.valor),
        professionalRevenueOriginLabel(row),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";"),
    )
    .join("\n");

  return `${header}\n${body}`;
}

export function downloadProfessionalRevenueCsv(filename: string, csv: string): void {
  downloadCashFlowCsv(filename, csv);
}
