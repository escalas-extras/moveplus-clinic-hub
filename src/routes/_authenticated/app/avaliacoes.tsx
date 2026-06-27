import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Search, ArrowRight, Lock, Clock, CheckCircle2, FileEdit } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AppShell,
  EmptyState,
  InfoCard,
  PageHeader,
  PageSection,
  StatusBadge,
} from "@/components/layout";
import { fmtDate } from "@/lib/format";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/app/avaliacoes")({
  component: AvaliacoesPage,
});

function AvaliacoesPage() {
  const { clinicId } = useActiveClinic();
  const [q, setQ] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["avaliacoes-list", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from("assessments")
        .select(
          "id, tipo, data, locked_at, status, patient_id, diagnostico_clinico, patients(nome_completo), professionals(nome)",
        )
        .eq("clinic_id", clinicId!)
        .order("data", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return items;
    return (items as any[]).filter((a) =>
      `${a.patients?.nome_completo ?? ""} ${a.professionals?.nome ?? ""} ${a.tipo ?? ""} ${a.diagnostico_clinico ?? ""}`
        .toLowerCase()
        .includes(s),
    );
  }, [items, q]);

  const kpis = useMemo(() => {
    const rows = items as any[];
    return {
      total: rows.length,
      finalizadas: rows.filter((a) => a.locked_at).length,
      rascunhos: rows.filter((a) => !a.locked_at).length,
    };
  }, [items]);

  return (
    <AppShell className="dashboard-premium">
      <PageHeader
        icon={ClipboardList}
        eyebrow="Prontuário clínico"
        title="Avaliações"
        description="Avaliações fisioterapêuticas registradas em todos os prontuários da clínica."
      />

      {isLoading ? (
        <AvaliacoesSkeleton />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
            <KpiCard icon={ClipboardList} label="Total" value={kpis.total} accent="var(--primary)" />
            <KpiCard icon={CheckCircle2} label="Finalizadas" value={kpis.finalizadas} accent="#059669" />
            <KpiCard icon={FileEdit} label="Rascunhos" value={kpis.rascunhos} accent="#d97706" />
          </section>

          <InfoCard icon={Search} title="Pesquisa rápida" description="Busque por paciente, profissional, tipo ou diagnóstico.">
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar avaliações…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/70 pl-9"
              />
            </div>
          </InfoCard>

          <PageSection
            icon={ClipboardList}
            title="Registros de avaliação"
            description={`${filtered.length} registro${filtered.length === 1 ? "" : "s"}`}
            contentClassName="p-0"
          >
            {filtered.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={q ? "Nenhuma avaliação encontrada" : "Nenhuma avaliação registrada"}
                description={
                  q
                    ? "Tente outro termo ou limpe a busca."
                    : "As avaliações são iniciadas no prontuário do paciente. Acesse um paciente para registrar a primeira avaliação."
                }
                action={!q ? { label: "Ir para pacientes", to: "/app/pacientes" } : undefined}
                className="py-12"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold">Data</th>
                      <th className="px-5 py-3 text-left font-bold">Paciente</th>
                      <th className="hidden px-5 py-3 text-left font-bold md:table-cell">Profissional</th>
                      <th className="hidden px-5 py-3 text-left font-bold lg:table-cell">Diagnóstico</th>
                      <th className="hidden px-5 py-3 text-left font-bold sm:table-cell">Tipo</th>
                      <th className="px-5 py-3 text-right font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(filtered as any[]).map((a) => (
                      <tr key={a.id} className="transition-colors hover:bg-emerald-50/40">
                        <td className="whitespace-nowrap px-5 py-3.5 tabular-nums font-medium">
                          {a.data ? fmtDate(a.data) : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <Link
                            to="/app/pacientes/$id"
                            params={{ id: a.patient_id }}
                            className="inline-flex items-center gap-1 font-semibold text-slate-950 hover:underline"
                          >
                            {a.patients?.nome_completo ?? "—"}
                            <ArrowRight className="h-3 w-3 opacity-60" />
                          </Link>
                        </td>
                        <td className="hidden px-5 py-3.5 text-muted-foreground md:table-cell">
                          {a.professionals?.nome ?? "—"}
                        </td>
                        <td className="hidden max-w-[200px] truncate px-5 py-3.5 text-muted-foreground lg:table-cell">
                          {a.diagnostico_clinico ?? "—"}
                        </td>
                        <td className="hidden px-5 py-3.5 capitalize sm:table-cell">{a.tipo ?? "avaliação"}</td>
                        <td className="px-5 py-3.5 text-right">
                          {a.locked_at ? (
                            <StatusBadge variant="success">
                              <Lock className="mr-1 h-3 w-3" />
                              Finalizada
                            </StatusBadge>
                          ) : (
                            <StatusBadge variant="warning">
                              <Clock className="mr-1 h-3 w-3" />
                              Rascunho
                            </StatusBadge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PageSection>
        </>
      )}
    </AppShell>
  );
}

function AvaliacoesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.55)] sm:p-5">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: `${accent}18`, color: accent }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums tracking-tight">{value}</div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
