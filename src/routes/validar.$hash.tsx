import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/validar/$hash")({
  component: ValidatePage,
});

function ValidatePage() {
  const { hash } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["validate-doc", hash],
    queryFn: async () => {
      const { data } = await supabase.from("clinical_documents")
        .select("id, doc_type, title, issued_at, locked_at, validation_hash, patient_id, professional_id")
        .eq("validation_hash", hash).maybeSingle();
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-6 w-6" />
          <h1 className="text-xl font-semibold">Validação de Documento Move+</h1>
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">Verificando…</p> : data ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Documento autêntico</span>
            </div>
            <div className="text-sm space-y-1 border-t pt-3">
              <div><strong>Título:</strong> {data.title}</div>
              <div><strong>Tipo:</strong> {data.doc_type}</div>
              <div><strong>Emitido em:</strong> {fmtDate(data.issued_at)}</div>
              {data.locked_at && <div><strong>Assinado em:</strong> {fmtDate(data.locked_at)}</div>}
              <div className="text-xs text-muted-foreground break-all"><strong>Hash:</strong> {data.validation_hash}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" /> Documento não encontrado ou ainda não assinado.
          </div>
        )}
      </Card>
    </div>
  );
}
