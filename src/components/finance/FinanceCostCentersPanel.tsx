import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Landmark, Loader2, Pencil, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageSection } from "@/components/layout/PageSection";
import { SupportGuardButton } from "@/components/support-guard";
import {
  FINANCIAL_CATEGORY_COLOR_PRESETS,
  assertFinanceClinicId,
  duplicateCostCenterMessage,
  ensureDefaultFinanceCostCenters,
  financeQueryKeys,
  isDuplicateCostCenterError,
  parseCostCenterForm,
  sortCostCenters,
  type FinancialCostCenterRow,
} from "@/lib/finance";
import { cn } from "@/lib/utils";

type FinanceCostCentersPanelProps = {
  clinicId: string | null;
  supportMode: boolean;
};

type CostCenterForm = {
  name: string;
  code: string;
  color: string;
  sort_order: number;
};

const EMPTY_FORM: CostCenterForm = {
  name: "",
  code: "",
  color: FINANCIAL_CATEGORY_COLOR_PRESETS[0],
  sort_order: 0,
};

export function FinanceCostCentersPanel({ clinicId, supportMode }: FinanceCostCentersPanelProps) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialCostCenterRow | null>(null);
  const [form, setForm] = useState<CostCenterForm>(EMPTY_FORM);

  const costCenters = useQuery({
    queryKey: financeQueryKeys.costCenters(clinicId),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const { data, error } = await supabase
        .from("financial_cost_centers")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const sorted = useMemo(
    () => [...(costCenters.data ?? [])].sort(sortCostCenters),
    [costCenters.data],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: financeQueryKeys.costCenters(clinicId) });
  };

  const save = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const parsed = parseCostCenterForm(form);

      if (editing) {
        const { error } = await supabase
          .from("financial_cost_centers")
          .update({
            name: parsed.name,
            code: parsed.code,
            color: parsed.color,
            sort_order: parsed.sort_order,
          })
          .eq("id", editing.id)
          .eq("clinic_id", clinicId);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("financial_cost_centers").insert({
        clinic_id: clinicId,
        name: parsed.name,
        code: parsed.code,
        color: parsed.color,
        sort_order: parsed.sort_order,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? "Centro de custo atualizado" : "Centro de custo criado");
      setDialogOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (e: unknown) => {
      if (isDuplicateCostCenterError(e)) {
        toast.error(duplicateCostCenterMessage());
        return;
      }
      toast.error(e instanceof Error ? e.message : "Erro ao salvar centro de custo");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { error } = await supabase
        .from("financial_cost_centers")
        .update({ is_active })
        .eq("id", id)
        .eq("clinic_id", clinicId);
      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      toast.success(is_active ? "Centro de custo ativado" : "Centro de custo inativado");
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar status"),
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      await ensureDefaultFinanceCostCenters(clinicId);
    },
    onSuccess: () => {
      toast.success("Centros de custo sugeridos adicionados");
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao sugerir centros de custo"),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(center: FinancialCostCenterRow) {
    setEditing(center);
    setForm({
      name: center.name,
      code: center.code ?? "",
      color: center.color ?? FINANCIAL_CATEGORY_COLOR_PRESETS[0],
      sort_order: center.sort_order,
    });
    setDialogOpen(true);
  }

  if (costCenters.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando centros de custo…
      </div>
    );
  }

  if (costCenters.isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-destructive">Não foi possível carregar os centros de custo.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => costCenters.refetch()}>
          Tentar novamente
        </Button>
      </Card>
    );
  }

  const hasAny = sorted.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Segmentação por área ou unidade da clínica. Centros inativos não aparecem em novos cadastros futuros.
        </p>
        <div className="flex flex-wrap gap-2">
          <SupportGuardButton
            variant="outline"
            supportMode={supportMode}
            onClick={() => seedDefaults.mutate()}
            tooltip="Sugerir padrões bloqueado no Modo Suporte"
            disabled={seedDefaults.isPending}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Sugerir padrões
          </SupportGuardButton>
          <SupportGuardButton
            supportMode={supportMode}
            onClick={openCreate}
            tooltip="Novo centro de custo bloqueado no Modo Suporte"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo centro de custo
          </SupportGuardButton>
        </div>
      </div>

      {!hasAny ? (
        <EmptyState
          icon={Landmark}
          title="Nenhum centro de custo cadastrado"
          description="Comece com os centros sugeridos ou crie segmentações personalizadas para a clínica."
          action={{ label: "Sugerir padrões", onClick: () => seedDefaults.mutate() }}
        />
      ) : (
        <PageSection
          title="Centros de custo"
          description="Áreas operacionais da clínica — código, ordem e cor opcionais."
        >
          <Card className="overflow-hidden">
            <ul className="divide-y">
              {sorted.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
                    !item.is_active && "bg-muted/30 opacity-75",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-black/5"
                      style={{ backgroundColor: item.color ?? "#94a3b8" }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium truncate">{item.name}</p>
                        {item.code && (
                          <Badge variant="outline" className="font-mono text-[10px] uppercase">
                            {item.code}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ordem {item.sort_order}
                        {!item.is_active && " · Inativo"}
                      </p>
                    </div>
                    {!item.is_active && (
                      <Badge variant="outline" className="shrink-0">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="flex items-center gap-2 pr-2">
                      <Label htmlFor={`cc-active-${item.id}`} className="text-xs text-muted-foreground">
                        Ativo
                      </Label>
                      <Switch
                        id={`cc-active-${item.id}`}
                        checked={item.is_active}
                        disabled={supportMode}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: item.id, is_active: checked })}
                      />
                    </div>
                    <SupportGuardButton
                      size="sm"
                      variant="outline"
                      supportMode={supportMode}
                      onClick={() => openEdit(item)}
                      tooltip="Editar bloqueado no Modo Suporte"
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Editar
                    </SupportGuardButton>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </PageSection>
      )}

      <CostCenterDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditing(null);
            setForm(EMPTY_FORM);
          }
        }}
        form={form}
        setForm={setForm}
        editing={editing}
        onSubmit={() => save.mutate()}
        pending={save.isPending}
        supportMode={supportMode}
      />
    </div>
  );
}

type CostCenterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CostCenterForm;
  setForm: (form: CostCenterForm) => void;
  editing: FinancialCostCenterRow | null;
  onSubmit: () => void;
  pending: boolean;
  supportMode: boolean;
};

function CostCenterDialog({
  open,
  onOpenChange,
  form,
  setForm,
  editing,
  onSubmit,
  pending,
  supportMode,
}: CostCenterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar centro de custo" : "Novo centro de custo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase">Nome</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex.: Atendimento Clínico"
              disabled={supportMode}
              maxLength={80}
            />
          </div>
          <div>
            <Label className="text-xs uppercase">Código (opcional)</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="Ex.: CLIN"
              disabled={supportMode}
              maxLength={12}
              className="font-mono uppercase"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase">Ordem</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                disabled={supportMode}
              />
            </div>
            <div>
              <Label className="text-xs uppercase">Cor (opcional)</Label>
              <Input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                disabled={supportMode}
                className="h-10 p-1"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {FINANCIAL_CATEGORY_COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                  form.color === color ? "border-foreground" : "border-transparent",
                )}
                style={{ backgroundColor: color }}
                disabled={supportMode}
                onClick={() => setForm({ ...form, color })}
                aria-label={`Cor ${color}`}
              />
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={supportMode || pending || !form.name.trim()}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
