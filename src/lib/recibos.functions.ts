import { supabase } from "@/integrations/supabase/client";

/** Status de extra elegível para recibo (sem alterar regras de aprovação). */
export const EXTRA_STATUS_PAGO = ["pago", "aprovado_financeiro"] as const;

export type VisibilidadeRecibo = "pendentes" | "arquivados" | "todos";

export type GerarRecibosResult = {
  reciboIdsCriados: string[];
  reciboIdsComplementados: string[];
  reciboIds: string[];
};

export type ReciboExtraFlow = {
  id: string;
  clinic_id: string;
  pagamento_id: string;
  semana_ref: string | null;
  arquivado_em: string | null;
  status: string;
  professional_id: string | null;
  valor: number;
  numero: number | null;
  data: string | null;
  description: string | null;
  created_at: string;
  professionals?: { nome: string | null } | null;
};

export type ExtraSemRecibo = {
  id: string;
  clinic_id: string;
  pagamento_id: string | null;
  semana_ref: string | null;
  status: string;
  professional_id: string | null;
  valor: number;
  descricao: string | null;
  data: string | null;
  recibo_id: string | null;
  professionals?: { nome: string | null } | null;
};

export type PagamentoFechamento = {
  id: string;
  clinic_id: string;
  data_pagamento: string | null;
  semana_ref: string | null;
  status: string | null;
  created_at: string;
};

/** União deduplicada de criados + complementados. */
export function mergeReciboIds(criados: string[], complementados: string[]): string[] {
  return [...new Set([...criados, ...complementados])];
}

function isReciboAtivo(recibo: { status?: string | null; arquivado_em?: string | null }) {
  return recibo.status !== "cancelado" && !recibo.arquivado_em;
}

/** Agrupa extras por profissional dentro do pagamento (pagamento_id é referência principal). */
function groupExtrasByProfessional<T extends { professional_id: string | null }>(extras: T[]) {
  const map = new Map<string, T[]>();
  for (const extra of extras) {
    const key = extra.professional_id ?? "__sem_profissional__";
    const list = map.get(key) ?? [];
    list.push(extra);
    map.set(key, list);
  }
  return map;
}

/**
 * Gera ou complementa recibos do fechamento informado.
 * Critério principal: pagamento_id. semana_ref não filtra elegibilidade.
 */
export async function gerarRecibosPagamento(
  clinicId: string,
  pagamentoId: string,
  userId: string | null,
): Promise<GerarRecibosResult> {
  const reciboIdsCriados: string[] = [];
  const reciboIdsComplementados: string[] = [];

  const { data: pagamento, error: pagErr } = await supabase
    .from("pagamentos" as never)
    .select("id, clinic_id, semana_ref, data_pagamento")
    .eq("id", pagamentoId)
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (pagErr) throw new Error(pagErr.message);
  if (!pagamento) throw new Error("Pagamento não encontrado para esta clínica.");

  const pag = pagamento as PagamentoFechamento;

  const { data: extrasRaw, error: extErr } = await supabase
    .from("extras" as never)
    .select("id, professional_id, valor, descricao, recibo_id, status, pagamento_id")
    .eq("clinic_id", clinicId)
    .eq("pagamento_id", pagamentoId)
    .in("status", [...EXTRA_STATUS_PAGO]);

  if (extErr) throw new Error(extErr.message);

  const extras = (extrasRaw ?? []) as Array<{
    id: string;
    professional_id: string | null;
    valor: number;
    descricao: string | null;
    recibo_id: string | null;
    status: string;
    pagamento_id: string;
  }>;

  const reciboIdsReferenciados = [
    ...new Set(extras.map((e) => e.recibo_id).filter(Boolean)),
  ] as string[];

  const recibosAtivosMap = new Map<string, ReciboExtraFlow>();
  if (reciboIdsReferenciados.length) {
    const { data: recibosRef, error: refErr } = await supabase
      .from("recibos" as never)
      .select("id, pagamento_id, professional_id, status, arquivado_em, valor")
      .eq("clinic_id", clinicId)
      .eq("pagamento_id", pagamentoId)
      .in("id", reciboIdsReferenciados);
    if (refErr) throw new Error(refErr.message);
    for (const r of (recibosRef ?? []) as ReciboExtraFlow[]) {
      if (isReciboAtivo(r)) recibosAtivosMap.set(r.id, r);
    }
  }

  const extrasSemReciboAtivo = extras.filter(
    (e) => !e.recibo_id || !recibosAtivosMap.has(e.recibo_id),
  );
  if (!extrasSemReciboAtivo.length) {
    return {
      reciboIdsCriados,
      reciboIdsComplementados,
      reciboIds: mergeReciboIds(reciboIdsCriados, reciboIdsComplementados),
    };
  }

  const { data: recibosExistentes, error: recErr } = await supabase
    .from("recibos" as never)
    .select("id, pagamento_id, professional_id, status, arquivado_em, valor")
    .eq("clinic_id", clinicId)
    .eq("pagamento_id", pagamentoId)
    .is("arquivado_em", null)
    .neq("status", "cancelado");

  if (recErr) throw new Error(recErr.message);

  const reciboPorProf = new Map<string, ReciboExtraFlow>();
  for (const r of (recibosExistentes ?? []) as ReciboExtraFlow[]) {
    const key = r.professional_id ?? "__sem_profissional__";
    if (!reciboPorProf.has(key)) reciboPorProf.set(key, r);
  }

  const grupos = groupExtrasByProfessional(extrasSemReciboAtivo);

  for (const [profKey, grupoExtras] of grupos) {
    const professionalId = profKey === "__sem_profissional__" ? null : profKey;
    const valorGrupo = grupoExtras.reduce((s, e) => s + Number(e.valor ?? 0), 0);
    const descricoes = grupoExtras
      .map((e) => e.descricao)
      .filter(Boolean)
      .join("; ");
    const existente = reciboPorProf.get(profKey);

    if (existente) {
      const novoValor = Number(existente.valor ?? 0) + valorGrupo;
      const { error: updErr } = await supabase
        .from("recibos" as never)
        .update({
          valor: novoValor,
          description: descricoes || existente.description,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", existente.id)
        .eq("clinic_id", clinicId);

      if (updErr) throw new Error(updErr.message);

      const extraIds = grupoExtras.map((e) => e.id);
      const { error: linkErr } = await supabase
        .from("extras" as never)
        .update({ recibo_id: existente.id } as never)
        .in("id", extraIds)
        .eq("clinic_id", clinicId);

      if (linkErr) throw new Error(linkErr.message);
      reciboIdsComplementados.push(existente.id);
      continue;
    }

    const { data: novo, error: insErr } = await supabase
      .from("recibos" as never)
      .insert({
        clinic_id: clinicId,
        pagamento_id: pagamentoId,
        semana_ref: pag.semana_ref ?? null,
        professional_id: professionalId,
        valor: valorGrupo,
        description: descricoes || "Extras — pagamento semanal",
        data: pag.data_pagamento ?? new Date().toISOString().slice(0, 10),
        status: "ativo",
        created_by: userId,
      } as never)
      .select("id")
      .single();

    if (insErr) throw new Error(insErr.message);

    const reciboId = (novo as { id: string }).id;
    const extraIds = grupoExtras.map((e) => e.id);
    const { error: linkErr } = await supabase
      .from("extras" as never)
      .update({ recibo_id: reciboId } as never)
      .in("id", extraIds)
      .eq("clinic_id", clinicId);

    if (linkErr) throw new Error(linkErr.message);

    reciboIdsCriados.push(reciboId);
    reciboPorProf.set(profKey, {
      id: reciboId,
      clinic_id: clinicId,
      pagamento_id: pagamentoId,
      semana_ref: pag.semana_ref,
      arquivado_em: null,
      status: "ativo",
      professional_id: professionalId,
      valor: valorGrupo,
      numero: null,
      data: pag.data_pagamento,
      description: descricoes,
      created_at: new Date().toISOString(),
    });
  }

  return {
    reciboIdsCriados,
    reciboIdsComplementados,
    reciboIds: mergeReciboIds(reciboIdsCriados, reciboIdsComplementados),
  };
}

/** Lista recibos do pagamento com filtro de visibilidade por arquivado_em. */
export async function listRecibosPagamento(
  clinicId: string,
  pagamentoId: string,
  visibilidade: VisibilidadeRecibo,
): Promise<ReciboExtraFlow[]> {
  let q = supabase
    .from("recibos" as never)
    .select(
      "id, clinic_id, pagamento_id, semana_ref, arquivado_em, status, professional_id, valor, numero, data, description, created_at, professionals(nome)",
    )
    .eq("clinic_id", clinicId)
    .eq("pagamento_id", pagamentoId)
    .order("created_at", { ascending: false });

  if (visibilidade === "pendentes") {
    q = q.is("arquivado_em", null);
  } else if (visibilidade === "arquivados") {
    q = q.not("arquivado_em", "is", null);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as ReciboExtraFlow[];
}

/**
 * Extras pagas/aprovadas sem vínculo a recibo ativo.
 * Não filtra por semana_ref — inclui retroativas esquecidas.
 */
export async function listExtrasPagasSemRecibo(clinicId: string): Promise<ExtraSemRecibo[]> {
  const { data: extrasRaw, error: extErr } = await supabase
    .from("extras" as never)
    .select(
      "id, clinic_id, pagamento_id, semana_ref, status, professional_id, valor, descricao, data, recibo_id, professionals(nome)",
    )
    .eq("clinic_id", clinicId)
    .in("status", [...EXTRA_STATUS_PAGO])
    .order("data", { ascending: false })
    .limit(500);

  if (extErr) throw new Error(extErr.message);

  const extras = (extrasRaw ?? []) as ExtraSemRecibo[];
  const reciboIds = [...new Set(extras.map((e) => e.recibo_id).filter(Boolean))] as string[];

  const ativos = new Set<string>();
  if (reciboIds.length) {
    const { data: recibos, error: recErr } = await supabase
      .from("recibos" as never)
      .select("id, status, arquivado_em")
      .eq("clinic_id", clinicId)
      .in("id", reciboIds);
    if (recErr) throw new Error(recErr.message);
    for (const r of (recibos ?? []) as Array<{
      id: string;
      status: string;
      arquivado_em: string | null;
    }>) {
      if (isReciboAtivo(r)) ativos.add(r.id);
    }
  }

  return extras.filter((e) => !e.recibo_id || !ativos.has(e.recibo_id));
}

export async function listPagamentos(clinicId: string): Promise<PagamentoFechamento[]> {
  const { data, error } = await supabase
    .from("pagamentos" as never)
    .select("id, clinic_id, data_pagamento, semana_ref, status, created_at")
    .eq("clinic_id", clinicId)
    .order("data_pagamento", { ascending: false })
    .limit(52);

  if (error) throw new Error(error.message);
  return (data ?? []) as PagamentoFechamento[];
}

export async function fetchRecibosByIds(
  clinicId: string,
  ids: string[],
): Promise<ReciboExtraFlow[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("recibos" as never)
    .select(
      "id, clinic_id, pagamento_id, semana_ref, arquivado_em, status, professional_id, valor, numero, data, description, created_at, professionals(nome, profissao, conselho, registro)",
    )
    .eq("clinic_id", clinicId)
    .in("id", ids);
  if (error) throw new Error(error.message);
  return (data ?? []) as ReciboExtraFlow[];
}
