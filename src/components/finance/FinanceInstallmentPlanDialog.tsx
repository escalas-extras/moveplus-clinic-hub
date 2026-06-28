import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { SupportGuardButton } from "@/components/support-guard";
import {
  INSTALLMENT_PLAN_STATUS_LABELS,
  RECEIVABLE_STATUS_LABELS,
  assertFinanceClinicId,
  cancelFinancialInstallmentPlan,
  financeQueryKeys,
  installmentPlanStatusVariant,
  invalidateFinanceModuleQueries,
  receivableStatusVariant,
  type ReceivableRow,
} from "@/lib/finance";
import { brl, fmtDate } from "@/lib/format";

type FinanceInstallmentPlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string | null;
  clinicId: string | null;
  supportMode: boolean;
};

export function FinanceInstallmentPlanDialog({
  open,
  onOpenChange,
  planId,
  clinicId,
  supportMode,
}: FinanceInstallmentPlanDialogProps) {
  const qc = useQueryClient();

  const planQuery = useQuery({
    queryKey: financeQueryKeys.installmentPlan(clinicId, planId ?? ""),
    enabled: !!clinicId && !!planId && open,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const { data, error } = await supabase
        .from("financial_installment_plans")
        .select("*, patients(nome_completo)")
        .eq("clinic_id", clinicId)
        .eq("id", planId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const installmentsQuery = useQuery({
    queryKey: [...financeQueryKeys.installmentPlan(clinicId, planId ?? ""), "entries"],
    enabled: !!clinicId && !!planId && open,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const { data, error } = await supabase
        .from("financial_entries")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("installment_plan_id", planId!)
        .order("installment_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ReceivableRow[];
    },
  });

  const cancelPlan = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (!planId) return;
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      await cancelFinancialInstallmentPlan(supabase, clinicId, planId);
    },
    onSuccess: () => {
      toast.success("Plano de parcelamento cancelado");
      invalidateFinanceModuleQueries(qc, clinicId);
      qc.invalidateQueries({ queryKey: financeQueryKeys.installmentPlan(clinicId, planId ?? "") });
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao cancelar plano"),
  });

  const plan = planQuery.data;
  const installments = installmentsQuery.data ?? [];
  const hasPaid = installments.some((i) => i.status === "pago");
  const canCancelPlan = plan?.status === "active" && !hasPaid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Parcelamento</DialogTitle>
        </DialogHeader>

        {planQuery.isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando…
          </div>
        ) : plan ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{(plan as { patients?: { nome_completo: string } }).patients?.nome_completo ?? "—"}</p>
                <StatusBadge variant={installmentPlanStatusVariant(plan.status)}>
                  {INSTALLMENT_PLAN_STATUS_LABELS[plan.status]}
                </StatusBadge>
              </div>
              <p className="mt-2 text-muted-foreground">
                {plan.installments_count} parcelas · Total {brl(plan.total_amount)} · 1º venc. {fmtDate(plan.first_due_date)}
              </p>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2">Parcela</th>
                    <th className="px-3 py-2">Vencimento</th>
                    <th className="px-3 py-2">Valor</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Documento</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        {row.installment_number}/{row.installment_total}
                      </td>
                      <td className="px-3 py-2">{fmtDate(row.data_vencimento ?? row.data)}</td>
                      <td className="px-3 py-2">{brl(row.valor)}</td>
                      <td className="px-3 py-2">
                        <StatusBadge variant={receivableStatusVariant(row.status)}>
                          {RECEIVABLE_STATUS_LABELS[row.status]}
                        </StatusBadge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.documento ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasPaid && plan.status === "active" && (
              <p className="text-xs text-muted-foreground">
                Parcelas pagas são preservadas. O plano não pode ser cancelado enquanto houver parcelas recebidas.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-destructive">Plano não encontrado.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          {canCancelPlan && (
            <SupportGuardButton
              supportMode={supportMode}
              variant="destructive"
              onClick={() => cancelPlan.mutate()}
              disabled={cancelPlan.isPending}
            >
              {cancelPlan.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancelar plano
            </SupportGuardButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
