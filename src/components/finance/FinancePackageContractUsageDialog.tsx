import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { SupportGuardButton } from "@/components/support-guard";
import {
  PATIENT_PACKAGE_STATUS_LABELS,
  PATIENT_PACKAGE_USAGE_STATUS_LABELS,
  assertFinanceClinicId,
  canRegisterPackageUsage,
  emptyPackageUsageForm,
  financeQueryKeys,
  isPackageContractExpired,
  packageUsageStatusVariant,
  parsePackageUsageForm,
  parseUsageReversal,
  patientPackageStatusVariant,
  type PackageUsageForm,
  type PackageUsageRow,
  type PatientPackageRow,
} from "@/lib/finance";
import { fmtDate } from "@/lib/format";

type FinancePackageContractUsageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: PatientPackageRow | null;
  clinicId: string | null;
  supportMode: boolean;
  professionals: { id: string; nome: string }[];
};

const SELECT_NONE = "none";

export function FinancePackageContractUsageDialog({
  open,
  onOpenChange,
  contract,
  clinicId,
  supportMode,
  professionals,
}: FinancePackageContractUsageDialogProps) {
  const qc = useQueryClient();
  const [usageForm, setUsageForm] = useState<PackageUsageForm>(emptyPackageUsageForm());
  const [reverseTarget, setReverseTarget] = useState<PackageUsageRow | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  useEffect(() => {
    if (open) {
      setUsageForm(emptyPackageUsageForm());
      setReverseTarget(null);
      setReversalReason("");
    }
  }, [open, contract?.id]);

  const contractLive = useQuery({
    queryKey: financeQueryKeys.patientPackageDetail(clinicId, contract?.id ?? ""),
    enabled: !!clinicId && !!contract?.id && open,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const { data, error } = await supabase
        .from("patient_package_contracts")
        .select(`
          *,
          clinical_package_templates(name, session_count, validity_days),
          patients(nome_completo),
          professionals(nome)
        `)
        .eq("clinic_id", clinicId)
        .eq("id", contract!.id)
        .single();
      if (error) throw error;
      return data as PatientPackageRow;
    },
  });

  const displayContract = contractLive.data ?? contract;

  const usages = useQuery({
    queryKey: financeQueryKeys.packageUsages(clinicId, contract?.id ?? ""),
    enabled: !!clinicId && !!contract?.id && open,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const { data, error } = await supabase
        .from("patient_package_usages")
        .select("*, professionals(nome)")
        .eq("clinic_id", clinicId)
        .eq("patient_package_contract_id", contract!.id)
        .order("usage_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PackageUsageRow[];
    },
  });

  const invalidate = () => {
    if (!clinicId || !contract?.id) return;
    qc.invalidateQueries({ queryKey: financeQueryKeys.packageUsages(clinicId, contract.id) });
    qc.invalidateQueries({ queryKey: financeQueryKeys.patientPackageDetail(clinicId, contract.id) });
    qc.invalidateQueries({ queryKey: ["finance", clinicId, "patient-packages"] });
  };

  const registerUsage = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (!displayContract) throw new Error("Contrato não selecionado.");
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");

      const parsed = parsePackageUsageForm(usageForm, displayContract);
      const { data: u } = await supabase.auth.getUser();

      const { error } = await supabase.from("patient_package_usages").insert({
        clinic_id: clinicId,
        patient_package_contract_id: displayContract.id,
        patient_id: displayContract.patient_id,
        professional_id: parsed.professional_id,
        usage_date: parsed.usage_date,
        quantity: parsed.quantity,
        notes: parsed.notes,
        status: "active",
        created_by: u.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Consumo registrado");
      setUsageForm(emptyPackageUsageForm());
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao registrar consumo"),
  });

  const reverseUsage = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (!reverseTarget) return;
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");

      const { reversal_reason } = parseUsageReversal(reversalReason);
      const { data: u } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("patient_package_usages")
        .update({
          status: "reversed",
          reversed_at: new Date().toISOString(),
          reversed_by: u.user?.id ?? null,
          reversal_reason,
        })
        .eq("id", reverseTarget.id)
        .eq("clinic_id", clinicId)
        .eq("status", "active");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Consumo estornado");
      setReverseTarget(null);
      setReversalReason("");
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao estornar consumo"),
  });

  if (!displayContract) return null;

  const expired = isPackageContractExpired(displayContract);
  const canRegister = canRegisterPackageUsage(displayContract);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Consumo de sessões</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{displayContract.patients?.nome_completo ?? "—"}</p>
                <span className="text-muted-foreground">·</span>
                <p>{displayContract.clinical_package_templates?.name ?? "—"}</p>
                <StatusBadge variant={patientPackageStatusVariant(displayContract.status)}>
                  {PATIENT_PACKAGE_STATUS_LABELS[displayContract.status]}
                </StatusBadge>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Usadas</p>
                  <p className="font-semibold">{displayContract.sessions_used} / {displayContract.sessions_total}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Saldo (créditos)</p>
                  <p className="font-semibold">{displayContract.sessions_remaining} sessão(ões)</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Validade</p>
                  <p className={expired ? "font-semibold text-destructive" : "font-semibold"}>
                    {fmtDate(displayContract.valid_until)}
                  </p>
                </div>
              </div>
              {expired && displayContract.status === "ativo" && (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-xs">Contrato vencido. Consumo exige confirmação explícita.</p>
                </div>
              )}
            </div>

            {canRegister && (
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium">Registrar consumo</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={usageForm.usage_date}
                      onChange={(e) => setUsageForm((f) => ({ ...f, usage_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min={1}
                      max={displayContract.sessions_remaining}
                      value={usageForm.quantity}
                      onChange={(e) => setUsageForm((f) => ({ ...f, quantity: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Profissional (opcional)</Label>
                  <Select
                    value={usageForm.professional_id || SELECT_NONE}
                    onValueChange={(v) =>
                      setUsageForm((f) => ({ ...f, professional_id: v === SELECT_NONE ? "" : v }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECT_NONE}>Nenhum</SelectItem>
                      {professionals.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    rows={2}
                    value={usageForm.notes}
                    onChange={(e) => setUsageForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                {expired && (
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={usageForm.confirmExpired}
                      onCheckedChange={(checked) =>
                        setUsageForm((f) => ({ ...f, confirmExpired: checked === true }))
                      }
                    />
                    <span>Confirmo consumo fora da validade do contrato</span>
                  </label>
                )}
                <SupportGuardButton
                  supportMode={supportMode}
                  onClick={() => registerUsage.mutate()}
                  disabled={registerUsage.isPending}
                >
                  {registerUsage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar consumo
                </SupportGuardButton>
              </div>
            )}

            {!canRegister && displayContract.status !== "ativo" && (
              <p className="text-sm text-muted-foreground">
                Contrato {PATIENT_PACKAGE_STATUS_LABELS[displayContract.status].toLowerCase()} — novos consumos não permitidos.
              </p>
            )}

            {!canRegister && displayContract.status === "ativo" && displayContract.sessions_remaining <= 0 && (
              <p className="text-sm text-muted-foreground">Saldo esgotado — novos consumos não permitidos.</p>
            )}

            <div>
              <p className="mb-2 text-sm font-medium">Histórico de consumos</p>
              {usages.isLoading ? (
                <div className="flex items-center py-6 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando…
                </div>
              ) : !usages.data?.length ? (
                <p className="py-4 text-sm text-muted-foreground">Nenhum consumo registrado.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                        <th className="px-3 py-2">Data</th>
                        <th className="px-3 py-2">Qtd</th>
                        <th className="px-3 py-2">Profissional</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Obs.</th>
                        <th className="px-3 py-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usages.data.map((usage) => (
                        <tr key={usage.id} className="border-b last:border-0">
                          <td className="px-3 py-2">{fmtDate(usage.usage_date)}</td>
                          <td className="px-3 py-2">{usage.quantity}</td>
                          <td className="px-3 py-2">{usage.professionals?.nome ?? "—"}</td>
                          <td className="px-3 py-2">
                            <StatusBadge variant={packageUsageStatusVariant(usage.status)}>
                              {PATIENT_PACKAGE_USAGE_STATUS_LABELS[usage.status]}
                            </StatusBadge>
                          </td>
                          <td className="px-3 py-2 max-w-[140px] truncate text-muted-foreground">
                            {usage.status === "reversed"
                              ? usage.reversal_reason ?? usage.notes ?? "—"
                              : usage.notes ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {usage.status === "active" && displayContract.status === "ativo" && (
                              <SupportGuardButton
                                supportMode={supportMode}
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setReverseTarget(usage);
                                  setReversalReason("");
                                }}
                              >
                                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                Estornar
                              </SupportGuardButton>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reverseTarget} onOpenChange={(o) => !o && setReverseTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Estornar consumo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O consumo será marcado como estornado e o saldo será devolvido. O registro permanece no histórico.
          </p>
          <div>
            <Label>Motivo</Label>
            <Textarea
              rows={3}
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseTarget(null)}>Cancelar</Button>
            <SupportGuardButton
              supportMode={supportMode}
              variant="destructive"
              onClick={() => reverseUsage.mutate()}
              disabled={reverseUsage.isPending}
            >
              {reverseUsage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar estorno
            </SupportGuardButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
