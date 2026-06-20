import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ShieldCheck, Lock } from "lucide-react";
import { fmtDate } from "@/lib/format";

const DOC_LABELS: Record<string, string> = {
  avaliacao_inicial: "Avaliação Inicial",
  reavaliacao: "Reavaliação",
  evolucao: "Evolução",
  relatorio: "Relatório",
  alta: "Alta",
  encaminhamento: "Encaminhamento",
  parecer: "Parecer Técnico",
};

export const Route = createFileRoute("/validar/$hash")({
  component: ValidatePage,
});

function ValidatePage() {
  const { hash } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["validate-doc", hash],
    queryFn: async () => {
      const { data } = await supabase
        .from("v_document_validation" as any)
        .select("*")
        .eq("validation_hash", hash)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted to-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-6 space-y-4 shadow-lg">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-6 w-6" />
          <h1 className="text-xl font-semibold">Validação Move+</h1>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Verificando autenticidade…</p>
        ) : data ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-md p-3 border border-emerald-200">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Documento autêntico e válido</span>
            </div>

            <div className="text-sm space-y-2 border-t pt-3">
              <Row label="Documento" value={(data as any).title || DOC_LABELS[(data as any).doc_type] || (data as any).doc_type} />
              <Row label="Tipo" value={DOC_LABELS[(data as any).doc_type] || (data as any).doc_type} />
              <Row label="Paciente" value={(data as any).paciente_iniciais || "—"} hint="Apenas iniciais (LGPD)" />
              <Row label="Profissional responsável" value={(data as any).profissional_nome || "—"} />
              {(data as any).profissional_registro && (
                <Row label="Registro" value={(data as any).profissional_registro} />
              )}
              <Row label="Clínica" value={(data as any).clinica_nome || "—"} />
              <Row label="Emitido em" value={fmtDate((data as any).issued_at)} />
              {(data as any).locked_at && <Row label="Assinado em" value={fmtDate((data as any).locked_at)} />}
              <div className="pt-2 border-t">
                <Badge variant="secondary" className="text-xs">Status: {(data as any).status}</Badge>
              </div>
              <div className="text-[10px] text-muted-foreground break-all flex items-start gap-1 pt-2">
                <Lock className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span><strong>Hash:</strong> {hash}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground border-t pt-3">
              Dados clínicos sensíveis não são exibidos publicamente em conformidade com a LGPD.
              Para acesso ao conteúdo completo, autentique-se na plataforma.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-md p-3">
            <XCircle className="h-5 w-5" /> Documento não encontrado ou ainda não assinado.
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
