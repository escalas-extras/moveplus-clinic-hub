import { Link } from "@tanstack/react-router";
import { ChevronRight, FileText, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageSection, EmptyState, StatusBadge } from "@/components/layout";
import { fmtDate } from "@/lib/format";
import { useActiveClinic } from "@/lib/active-clinic";

const DOC_LABELS: Record<string, string> = {
  avaliacao: "Avaliação",
  reavaliacao: "Reavaliação",
  evolucao: "Evolução",
  relatorio: "Relatório",
  laudo: "Laudo",
  alta: "Alta",
  plano: "Plano",
};

type Props = {
  patientId: string;
};

export function Patient360RecentDocuments({ patientId }: Props) {
  const { clinicId } = useActiveClinic();

  const docs = useQuery({
    queryKey: ["patient-clinical-documents", clinicId, patientId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinical_documents")
        .select("id, title, doc_type, issued_at, locked_at")
        .eq("clinic_id", clinicId!)
        .eq("patient_id", patientId)
        .order("issued_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const items = docs.data ?? [];

  return (
    <PageSection
      icon={FileText}
      title="Últimos documentos"
      description="Documentos clínicos emitidos recentemente."
      contentClassName="space-y-2"
      className="fos-animate-in"
    >
      {docs.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum documento emitido"
          description="Laudos, relatórios e orientações aparecerão aqui após a emissão."
          action={{ label: "Emitir documento", to: "/app/documentos" }}
          className="py-8"
        />
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((doc) => (
              <li key={doc.id}>
                <Link
                  to="/app/documentos"
                  search={{ patient: patientId }}
                  className="group flex items-center gap-3 rounded-2xl border border-[rgba(15,76,92,0.08)] bg-white px-4 py-3 transition-all hover:border-primary/20 hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{doc.title}</p>
                    <p className="text-xs text-slate-500">
                      {DOC_LABELS[doc.doc_type] ?? doc.doc_type} · {fmtDate(doc.issued_at?.slice(0, 10) ?? "")}
                    </p>
                  </div>
                  {!doc.locked_at ? (
                    <StatusBadge variant="warning">Rascunho</StatusBadge>
                  ) : (
                    <StatusBadge variant="success">Final</StatusBadge>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-primary" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to="/app/documentos"
            search={{ patient: patientId }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Plus className="h-4 w-4" />
            Emitir novo documento
          </Link>
        </>
      )}
    </PageSection>
  );
}
