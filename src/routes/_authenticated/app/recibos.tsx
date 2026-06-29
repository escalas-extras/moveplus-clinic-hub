import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDown, Printer, Receipt, RefreshCw, Eye, FileX, Inbox } from "lucide-react";
import { toast } from "sonner";
import { brl, fmtDate } from "@/lib/format";
import { useActiveClinic } from "@/lib/active-clinic";
import { SupportGuardButton } from "@/components/support-guard";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { InfoCard } from "@/components/layout/InfoCard";
import { EmptyState } from "@/components/layout/EmptyState";
import {
  fetchRecibosByIds,
  gerarRecibosPagamento,
  listExtrasPagasSemRecibo,
  listPagamentos,
  listRecibosPagamento,
  type GerarRecibosResult,
  type ReciboExtraFlow,
  type VisibilidadeRecibo,
} from "@/lib/recibos.functions";
import {
  downloadReceiptPdf,
  previewReceiptPdf,
  printReceiptPdf,
  downloadReceiptsBatchPdf,
  previewReceiptsBatchPdf,
  printReceiptsBatchPdf,
  getStoredReceiptPrintMode,
  type ReceiptPdfData,
  type ReceiptPrintMode,
} from "@/lib/receipt-pdf";
import { ReceiptPrintModeSelector } from "@/components/receipt-print-mode";
import type { Professional } from "@/lib/pdf-engine";

export const Route = createFileRoute("/_authenticated/app/recibos")({
  component: RecibosPage,
});

type UltimaGeracao = GerarRecibosResult & { pagamentoId: string; at: string };

const ULTIMA_GERACAO_KEY = "recibos-ultima-geracao";

function loadUltimaGeracao(clinicId: string | null): UltimaGeracao | null {
  if (!clinicId || typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${ULTIMA_GERACAO_KEY}:${clinicId}`);
    return raw ? (JSON.parse(raw) as UltimaGeracao) : null;
  } catch {
    return null;
  }
}

function saveUltimaGeracao(clinicId: string, data: UltimaGeracao) {
  window.sessionStorage.setItem(`${ULTIMA_GERACAO_KEY}:${clinicId}`, JSON.stringify(data));
}

function RecibosPage() {
  const { clinicId, supportMode } = useActiveClinic();
  const qc = useQueryClient();
  const [pagamentoId, setPagamentoId] = useState<string>("");
  const [visibilidade, setVisibilidade] = useState<VisibilidadeRecibo>("pendentes");
  const [printMode, setPrintMode] = useState<ReceiptPrintMode>(() => getStoredReceiptPrintMode());
  const [ultimaGeracao, setUltimaGeracao] = useState<UltimaGeracao | null>(() =>
    loadUltimaGeracao(clinicId),
  );

  const pagamentos = useQuery({
    queryKey: ["pagamentos", clinicId],
    enabled: !!clinicId,
    queryFn: () => listPagamentos(clinicId!),
  });

  const pagamentoAtivo = pagamentoId || pagamentos.data?.[0]?.id || "";

  const recibos = useQuery({
    queryKey: ["recibos-extra", clinicId, pagamentoAtivo, visibilidade],
    enabled: !!clinicId && !!pagamentoAtivo,
    queryFn: () => listRecibosPagamento(clinicId!, pagamentoAtivo, visibilidade),
  });

  const extrasSemRecibo = useQuery({
    queryKey: ["extras-sem-recibo", clinicId],
    enabled: !!clinicId,
    queryFn: () => listExtrasPagasSemRecibo(clinicId!),
  });

  const gerar = useMutation({
    mutationFn: async () => {
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      if (!pagamentoAtivo) throw new Error("Selecione um pagamento.");
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura.");
      const { data: u } = await supabase.auth.getUser();
      return gerarRecibosPagamento(clinicId, pagamentoAtivo, u.user?.id ?? null);
    },
    onSuccess: (result) => {
      const payload: UltimaGeracao = {
        ...result,
        pagamentoId: pagamentoAtivo,
        at: new Date().toISOString(),
      };
      if (clinicId) saveUltimaGeracao(clinicId, payload);
      setUltimaGeracao(payload);
      toast.success(
        `Recibos gerados: ${result.reciboIdsCriados.length} criados, ${result.reciboIdsComplementados.length} complementados.`,
      );
      qc.invalidateQueries({ queryKey: ["recibos-extra", clinicId] });
      qc.invalidateQueries({ queryKey: ["extras-sem-recibo", clinicId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pagamentoLabel = useMemo(() => {
    const p = pagamentos.data?.find((x) => x.id === pagamentoAtivo);
    if (!p) return "—";
    const ref = p.semana_ref ? ` · ${p.semana_ref}` : "";
    return `${fmtDate(p.data_pagamento)}${ref}`;
  }, [pagamentos.data, pagamentoAtivo]);

  function rowToPdfData(r: Awaited<ReturnType<typeof fetchRecibosByIds>>[number]): ReceiptPdfData {
    return {
      numero: r.numero ?? 0,
      patientName: r.professionals?.nome ?? "Profissional",
      description: r.description ?? "Extras — pagamento semanal",
      serviceLabel: r.description ?? "extras",
      amount: Number(r.valor),
      payment_method: "transferencia",
      payment_date: r.data ?? new Date().toISOString().slice(0, 10),
      issued_at: r.created_at,
      professional: (r.professionals as Professional | null | undefined) ?? null,
      cancelled: r.status === "cancelado",
      clinicId,
      printMode,
    };
  }

  async function renderRecibosLote(ids: string[], mode: "preview" | "download" | "print") {
    if (!clinicId || !ids.length) return;
    const rows = await fetchRecibosByIds(clinicId, ids);
    if (!rows.length) {
      toast.error("Nenhum recibo encontrado para a última geração.");
      return;
    }
    const items = rows.map(rowToPdfData);
    if (mode === "preview") await previewReceiptsBatchPdf(items);
    else if (mode === "print") await printReceiptsBatchPdf(items);
    else await downloadReceiptsBatchPdf(items, `Recibos_${items.length}.pdf`);
    toast.success(`${rows.length} recibo(s) processado(s).`);
  }

  async function reprint(r: ReciboExtraFlow, mode: "preview" | "download" | "print") {
    if (!clinicId) return;
    const pdfData: ReceiptPdfData = {
      numero: r.numero ?? 0,
      patientName: r.professionals?.nome ?? "Profissional",
      description: r.description ?? "Extras — pagamento semanal",
      serviceLabel: r.description ?? "extras",
      amount: Number(r.valor),
      payment_method: "transferencia",
      payment_date: r.data ?? new Date().toISOString().slice(0, 10),
      issued_at: r.created_at,
      professional: (r.professionals as Professional | null | undefined) ?? null,
      cancelled: r.status === "cancelado",
      clinicId,
      printMode,
    };
    if (mode === "preview") await previewReceiptPdf(pdfData);
    else if (mode === "print") await printReceiptPdf(pdfData);
    else await downloadReceiptPdf(pdfData);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recibos — Legado Extra Flow"
        description="Fluxo legado de recibos por fechamento de pagamento. O caminho canônico de recibos da clínica fica em Financeiro > Recibos."
        eyebrow="Financeiro"
        icon={Receipt}
        actions={
          <SupportGuardButton
            supportMode={supportMode}
            onClick={() => gerar.mutate()}
            disabled={!pagamentoAtivo || gerar.isPending}
            tooltip="Geração bloqueada no Modo Suporte"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${gerar.isPending ? "animate-spin" : ""}`} />
            Gerar recibos do pagamento
          </SupportGuardButton>
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Fechamento
          </span>
          <Select value={pagamentoAtivo} onValueChange={setPagamentoId}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Selecione o pagamento" />
            </SelectTrigger>
            <SelectContent>
              {(pagamentos.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {fmtDate(p.data_pagamento)}
                  {p.semana_ref ? ` · ${p.semana_ref}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <ReceiptPrintModeSelector
            value={printMode}
            onChange={setPrintMode}
            className="rounded-lg border bg-muted/30 p-3"
            compact
          />
          <Tabs value={visibilidade} onValueChange={(v) => setVisibilidade(v as VisibilidadeRecibo)}>
            <TabsList>
              <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
              <TabsTrigger value="arquivados">Arquivados</TabsTrigger>
              <TabsTrigger value="todos">Todos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {ultimaGeracao && ultimaGeracao.reciboIds.length > 0 && (
        <InfoCard title="Última geração" className="border-emerald-100 bg-emerald-50/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Criados</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {ultimaGeracao.reciboIdsCriados.length}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Complementados</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {ultimaGeracao.reciboIdsComplementados.length}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total afetado</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {ultimaGeracao.reciboIds.length}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => renderRecibosLote(ultimaGeracao.reciboIds, "print")}
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Imprimir última geração
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => renderRecibosLote(ultimaGeracao.reciboIds, "download")}
              >
                <FileDown className="mr-1.5 h-3.5 w-3.5" />
                Baixar PDF última geração
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Pagamento: {pagamentoLabel} · {ultimaGeracao.reciboIds.length} recibo(s) na sessão atual
          </p>
        </InfoCard>
      )}

      <PageSection title={`Recibos — ${pagamentoLabel}`}>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left">
                <th className="px-4 py-3">Nº</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Profissional</th>
                <th className="px-4 py-3 hidden md:table-cell">Descrição</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recibos.data?.map((r) => (
                <tr key={r.id} className={r.status === "cancelado" ? "opacity-60" : ""}>
                  <td className="px-4 py-2 tabular-nums font-semibold">
                    {r.numero ? `#${r.numero}` : "—"}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{fmtDate(r.data)}</td>
                  <td className="px-4 py-2">{r.professionals?.nome ?? "—"}</td>
                  <td className="px-4 py-2 hidden md:table-cell truncate max-w-[260px] text-muted-foreground">
                    {r.description ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{brl(r.valor)}</td>
                  <td className="px-4 py-2">
                    {r.arquivado_em ? (
                      <Badge
                        variant="outline"
                        className="border-slate-200 bg-slate-50 text-slate-700"
                      >
                        Arquivado
                      </Badge>
                    ) : r.status === "cancelado" ? (
                      <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                        Cancelado
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-emerald-700"
                      >
                        Ativo
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => reprint(r, "preview")}>
                        <Eye className="mr-1 h-3 w-3" />
                        Ver
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => reprint(r, "download")}>
                        <FileDown className="mr-1 h-3 w-3" />
                        Baixar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => reprint(r, "print")}>
                        <Printer className="mr-1 h-3 w-3" />
                        Imprimir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!recibos.data?.length && (
            <EmptyState
              icon={Inbox}
              title="Sem recibos neste fechamento"
              description={
                visibilidade === "pendentes"
                  ? "Todos os recibos deste pagamento já foram emitidos."
                  : visibilidade === "arquivados"
                    ? "Nenhum recibo arquivado neste pagamento."
                    : "Ainda não há recibos para este pagamento."
              }
            />
          )}
        </Card>
      </PageSection>

      <PageSection
        title="Extras pagas sem recibo"
        description="Somente leitura. Inclui extras retroativas de qualquer semana_ref, sem bloquear geração."
      >
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Profissional</th>
                <th className="px-4 py-3 hidden md:table-cell">Descrição</th>
                <th className="px-4 py-3">Semana ref.</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {extrasSemRecibo.data?.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2 tabular-nums">{fmtDate(e.data)}</td>
                  <td className="px-4 py-2">{e.professionals?.nome ?? "—"}</td>
                  <td className="px-4 py-2 hidden md:table-cell truncate max-w-[260px] text-muted-foreground">
                    {e.descricao ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{e.semana_ref ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline">{e.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{brl(e.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!extrasSemRecibo.data?.length && (
            <EmptyState
              icon={FileX}
              title="Tudo certo por aqui"
              description="Não há extras pagas aguardando recibo."
            />
          )}
        </Card>
      </PageSection>
    </div>
  );
}
