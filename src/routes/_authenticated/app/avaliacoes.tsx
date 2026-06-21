import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ClipboardList, Search, ArrowRight, Lock, Clock } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { fmtDate } from "@/lib/format";
import { useState, useMemo } from "react";

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
        .select("id, tipo, data, locked_at, patient_id, patients(nome_completo), professionals(nome)")
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
      `${a.patients?.nome_completo ?? ""} ${a.professionals?.nome ?? ""} ${a.tipo ?? ""}`.toLowerCase().includes(s),
    );
  }, [items, q]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[2rem] leading-tight font-semibold tracking-tight">Avaliações</h1>
        <p className="mt-1.5 text-[16px] text-muted-foreground">Avaliações fisioterapêuticas registradas em todos os prontuários.</p>
      </header>

      <div className="flex items-center gap-2 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por paciente, profissional ou tipo…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={ClipboardList}
            title="Nenhuma avaliação encontrada"
            description="As avaliações iniciam diretamente do prontuário do paciente. Acesse um paciente para registrar a primeira avaliação fisioterapêutica."
            action={{ label: "Ir para pacientes", to: "/app/pacientes" }}
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Data</th>
                <th className="text-left px-5 py-3 font-semibold">Paciente</th>
                <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Profissional</th>
                <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Tipo</th>
                <th className="text-right px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {(filtered as any[]).map((a) => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 tabular-nums whitespace-nowrap">{a.data ? fmtDate(a.data) : "—"}</td>
                  <td className="px-5 py-3 font-medium">
                    <Link to="/app/pacientes/$id" params={{ id: a.patient_id }} className="hover:underline inline-flex items-center gap-1">
                      {a.patients?.nome_completo ?? "—"} <ArrowRight className="h-3 w-3 opacity-60" />
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{a.professionals?.nome ?? "—"}</td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <Badge variant="secondary" className="font-normal">{a.tipo ?? "avaliação"}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {a.locked_at ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                        <Lock className="h-3 w-3" /> Assinada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                        <Clock className="h-3 w-3" /> Rascunho
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
