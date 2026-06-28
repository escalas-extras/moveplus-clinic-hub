import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Lock, Plus } from "lucide-react";
import { fmtDateTime } from "@/lib/format";
import { useActiveClinic } from "@/lib/active-clinic";
import { ClinicalDocumentPdfActions } from "@/components/clinical-document-pdf-actions";

const DOC_TYPE_LABEL: Record<string, string> = {
  avaliacao: "Avaliação",
  reavaliacao: "Reavaliação",
  evolucao: "Evolução",
  relatorio: "Relatório",
  encaminhamento: "Encaminhamento",
  termo: "Termo",
  declaracao: "Declaração",
  laudo: "Laudo",
  contrato: "Contrato",
  alta: "Alta",
  plano: "Plano Terapêutico",
  recibo: "Recibo",
};

export function PatientDocumentsTab({ patientId }: { patientId: string }) {
  const { clinicId } = useActiveClinic();

  const { data: patient } = useQuery({
    queryKey: ["patient-doc-tab-name", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("patients")
        .select("nome_completo")
        .eq("id", patientId)
        .maybeSingle();
      return data;
    },
  });

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["patient-clinical-documents", clinicId, patientId],
    enabled: !!clinicId && !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("clinical_documents")
        .select("*")
        .eq("clinic_id", clinicId!)
        .eq("patient_id", patientId)
        .order("issued_at", { ascending: false });
      return data || [];
    },
  });

  const grouped = docs.reduce((acc: Record<string, any[]>, d: any) => {
    const key = DOC_TYPE_LABEL[d.doc_type] || d.doc_type;
    (acc[key] = acc[key] || []).push(d);
    return acc;
  }, {});

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Documentos do paciente</h2>
          <p className="text-xs text-muted-foreground">
            PDF arquivado preserva o layout da emissão; a pré-visualização usa o layout atual.
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/app/documentos" search={{ patient: patientId }}>
            <Plus className="h-4 w-4 mr-2" /> Emitir documento
          </Link>
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!isLoading && docs.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded">
          Nenhum documento emitido. Use "Emitir documento" para gerar contratos, termos, relatórios e mais.
        </div>
      )}

      {Object.entries(grouped).map(([cat, list]) => (
        <div key={cat}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{cat}</h3>
          <div className="space-y-2">
            {list.map((d: any) => (
              <div key={d.id} className="border rounded p-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{d.title}</span>
                    {d.locked_at && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Lock className="h-3 w-3 mr-1" /> Assinado
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {fmtDateTime(d.issued_at)}
                    {d.validation_hash && (
                      <span className="ml-2">
                        · <code>#{String(d.validation_hash).slice(0, 12)}…</code>
                      </span>
                    )}
                  </div>
                </div>
                {d.pdf_url && (
                  <ClinicalDocumentPdfActions
                    document={d}
                    patientName={patient?.nome_completo}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </Card>
  );
}
