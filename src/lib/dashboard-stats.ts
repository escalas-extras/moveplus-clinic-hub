import { supabase } from "@/integrations/supabase/client";

export type DashboardCoreStats = {
  pacientesAtivos: number;
  pacientesAntes: number;
  atendHoje: number;
  agendaSemana: number;
  docsMes: number;
  docsPrev: number;
  receitaMes: number;
  recebiveisVencidos: number;
};

export type DashboardDetailStats = {
  docsTotal: number;
  profissionais: number;
  avaliacoes: number;
  recibos: number;
  reavalPend: Array<{
    id: string;
    patient_id: string;
    scheduled_for: string;
    patients: { nome_completo: string } | null;
  }>;
  docsRascunho: number;
  evolSemAssin: number;
  hoje: Array<{
    id: string;
    data?: string;
    horario: string;
    status: string | null;
    observacao: string | null;
    patients: { nome_completo: string } | null;
    professionals: { nome: string } | null;
  }>;
  recentDocs: Array<{
    id: string;
    title: string;
    doc_type: string;
    issued_at: string;
    locked_at: string | null;
    patients: { nome_completo: string } | null;
  }>;
  recentPatients: Array<{
    id: string;
    nome_completo: string;
    created_at: string;
    situacao: string | null;
  }>;
};

export type DashboardStats = DashboardCoreStats & DashboardDetailStats;

export async function fetchDashboardCoreStats(
  clinicId: string,
  dates: {
    todayIso: string;
    weekStartIso: string;
    weekEndIso: string;
    thisMonthIso: string;
    prevMonthIso: string;
  },
): Promise<DashboardCoreStats> {
  const { todayIso, weekStartIso, weekEndIso, thisMonthIso, prevMonthIso } = dates;

  const [
    pacientesAtivos,
    pacientesAntes,
    atendHoje,
    agendaSemana,
    docsMes,
    docsPrev,
    receitaMesRows,
    recebiveisVencidos,
  ] = await Promise.all([
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("situacao", "ativo"),
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("situacao", "ativo")
      .lt("created_at", thisMonthIso),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("data", todayIso),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .gte("data", weekStartIso)
      .lte("data", weekEndIso),
    supabase
      .from("clinical_documents")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .gte("issued_at", thisMonthIso),
    supabase
      .from("clinical_documents")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .gte("issued_at", prevMonthIso)
      .lt("issued_at", thisMonthIso),
    supabase
      .from("financial_entries")
      .select("valor")
      .eq("clinic_id", clinicId)
      .eq("entry_type", "receivable")
      .eq("status", "pago")
      .gte("data", thisMonthIso),
    supabase
      .from("financial_entries")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("entry_type", "receivable")
      .eq("status", "pendente")
      .lt("data_vencimento", todayIso),
  ]);

  const receitaMes = (receitaMesRows.data ?? []).reduce((sum, r) => sum + Number(r.valor), 0);

  return {
    pacientesAtivos: pacientesAtivos.count ?? 0,
    pacientesAntes: pacientesAntes.count ?? 0,
    atendHoje: atendHoje.count ?? 0,
    agendaSemana: agendaSemana.count ?? 0,
    docsMes: docsMes.count ?? 0,
    docsPrev: docsPrev.count ?? 0,
    receitaMes,
    recebiveisVencidos: recebiveisVencidos.count ?? 0,
  };
}

export async function fetchDashboardDetailStats(
  clinicId: string,
  todayIso: string,
): Promise<DashboardDetailStats> {
  const [
    docsTotal,
    profissionais,
    avaliacoes,
    recibos,
    reavalPend,
    docsRascunho,
    evolSemAssin,
    hoje,
    recentDocs,
    recentPatients,
  ] = await Promise.all([
    supabase
      .from("clinical_documents")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId),
    supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId),
    supabase
      .from("assessments")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId),
    supabase
      .from("receipts")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId),
    supabase
      .from("reassessment_schedule")
      .select("id, patient_id, scheduled_for, patients(nome_completo)")
      .eq("clinic_id", clinicId)
      .lte("scheduled_for", todayIso)
      .is("completed_at", null)
      .order("scheduled_for")
      .limit(8),
    supabase
      .from("clinical_documents")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .is("locked_at", null),
    supabase
      .from("evolutions")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .is("locked_at", null),
    supabase
      .from("appointments")
      .select("id, data, horario, status, observacao, patients(nome_completo), professionals(nome)")
      .eq("clinic_id", clinicId)
      .eq("data", todayIso)
      .order("horario")
      .limit(12),
    supabase
      .from("clinical_documents")
      .select("id, title, doc_type, issued_at, locked_at, patients(nome_completo)")
      .eq("clinic_id", clinicId)
      .order("issued_at", { ascending: false })
      .limit(5),
    supabase
      .from("patients")
      .select("id, nome_completo, created_at, situacao")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    docsTotal: docsTotal.count ?? 0,
    profissionais: profissionais.count ?? 0,
    avaliacoes: avaliacoes.count ?? 0,
    recibos: recibos.count ?? 0,
    reavalPend: reavalPend.data ?? [],
    docsRascunho: docsRascunho.count ?? 0,
    evolSemAssin: evolSemAssin.count ?? 0,
    hoje: hoje.data ?? [],
    recentDocs: recentDocs.data ?? [],
    recentPatients: recentPatients.data ?? [],
  };
}

export const EMPTY_DASHBOARD_DETAILS: DashboardDetailStats = {
  docsTotal: 0,
  profissionais: 0,
  avaliacoes: 0,
  recibos: 0,
  reavalPend: [],
  docsRascunho: 0,
  evolSemAssin: 0,
  hoje: [],
  recentDocs: [],
  recentPatients: [],
};
