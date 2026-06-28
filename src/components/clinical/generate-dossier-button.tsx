import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadPdf } from "@/lib/pdf";
import { buildClinicalDossierPdfOpts } from "@/lib/clinical-dossier-pdf";
import { useActiveClinic } from "@/lib/active-clinic";

type GenerateDossierButtonProps = {
  patient: Record<string, unknown>;
  assessments: Record<string, unknown>[];
  evolutions: Record<string, unknown>[];
};

export function GenerateDossierButton({ patient, assessments, evolutions }: GenerateDossierButtonProps) {
  const { clinicId } = useActiveClinic();
  const [busy, setBusy] = useState(false);

  const generate = useMutation({
    mutationFn: async () => {
      if (!clinicId) throw new Error("Clínica ativa não identificada");
      const patientId = String(patient.id ?? "");

      const [dischargesRes, documentsRes, goalsRes] = await Promise.all([
        supabase
          .from("patient_discharges")
          .select("*, professionals(nome, conselho, registro, profissao)")
          .eq("patient_id", patientId)
          .order("data_alta", { ascending: false }),
        supabase
          .from("clinical_documents")
          .select("*")
          .eq("clinic_id", clinicId)
          .eq("patient_id", patientId)
          .order("issued_at", { ascending: false }),
        supabase
          .from("assessment_goals")
          .select("*")
          .eq("patient_id", patientId)
          .order("term")
          .order("created_at", { ascending: false }),
      ]);

      if (dischargesRes.error) throw dischargesRes.error;
      if (documentsRes.error) throw documentsRes.error;
      if (goalsRes.error) throw goalsRes.error;

      const opts = buildClinicalDossierPdfOpts({
        patient,
        assessments,
        evolutions,
        discharges: dischargesRes.data ?? [],
        documents: documentsRes.data ?? [],
        goals: goalsRes.data ?? [],
      });

      await downloadPdf({ ...opts, clinicId: opts.clinicId ?? clinicId });
    },
    onMutate: () => setBusy(true),
    onSuccess: () => toast.success("Dossiê clínico gerado com sucesso"),
    onError: (e: Error) => toast.error(e.message || "Falha ao gerar dossiê"),
    onSettled: () => setBusy(false),
  });

  return (
    <Button
      variant="default"
      onClick={() => generate.mutate()}
      disabled={busy || generate.isPending}
    >
      {busy || generate.isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <BookOpen className="h-4 w-4 mr-2" />
      )}
      Gerar Dossiê
    </Button>
  );
}
