import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FolderTree, Loader2, Pencil, Plus, Sparkles } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageSection } from "@/components/layout/PageSection";
import { SupportGuardButton } from "@/components/support-guard";
import {
  FINANCIAL_CATEGORY_COLOR_PRESETS,
  FINANCIAL_CATEGORY_TYPE_LABELS,
  FINANCIAL_CATEGORY_TYPE_PLURAL,
  assertFinanceClinicId,
  duplicateCategoryMessage,
  ensureDefaultFinanceCategories,
  financeQueryKeys,
  groupCategoriesByType,
  isDuplicateCategoryError,
  parseCategoryForm,
  type FinancialCategoryRow,
  type FinancialCategoryType,
} from "@/lib/finance";
import { cn } from "@/lib/utils";
import { FinancePanelGate } from "./FinancePanelGate";

type FinanceCategoriesPanelProps = {
  clinicId: string | null;
  clinicLoading: boolean;
  supportMode: boolean;
};

type CategoryForm = {
  name: string;
  type: FinancialCategoryType;
  color: string;
  sort_order: number;
};

const EMPTY_FORM: CategoryForm = {
  name: "",
  type: "income",
  color: FINANCIAL_CATEGORY_COLOR_PRESETS[0],
  sort_order: 0,
};

export function FinanceCategoriesPanel({ clinicId, clinicLoading, supportMode }: FinanceCategoriesPanelProps) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialCategoryRow | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);

  const categories = useQuery({
    queryKey: financeQueryKeys.categories(clinicId),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const { data, error } = await supabase
        .from("financial_categories")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: financeQueryKeys.categories(clinicId) });
  };

  const save = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const parsed = parseCategoryForm(form);

      if (editing) {
        const { error } = await supabase
          .from("financial_categories")
          .update({
            name: parsed.name,
            type: parsed.type,
            color: parsed.color,
            sort_order: parsed.sort_order,
          })
          .eq("id", editing.id)
          .eq("clinic_id", clinicId);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("financial_categories").insert({
        clinic_id: clinicId,
        name: parsed.name,
        type: parsed.type,
        color: parsed.color,
        sort_order: parsed.sort_order,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? "Categoria atualizada" : "Categoria criada");
      setDialogOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (e: unknown) => {
      const type = form.type;
      if (isDuplicateCategoryError(e)) {
        toast.error(duplicateCategoryMessage(type));
        return;
      }
      toast.error(e instanceof Error ? e.message : "Erro ao salvar categoria");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { error } = await supabase
        .from("financial_categories")
        .update({ is_active })
        .eq("id", id)
        .eq("clinic_id", clinicId);
      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      toast.success(is_active ? "Categoria ativada" : "Categoria inativada");
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar status"),
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      await ensureDefaultFinanceCategories(clinicId);
    },
    onSuccess: () => {
      toast.success("Categorias sugeridas adicionadas");
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao sugerir categorias"),
  });

  function openCreate(type?: FinancialCategoryType) {
    setEditing(null);
    setForm({ ...EMPTY_FORM, type: type ?? "income" });
    setDialogOpen(true);
  }

  function openEdit(category: FinancialCategoryRow) {
    setEditing(category);
    setForm({
      name: category.name,
      type: category.type as FinancialCategoryType,
      color: category.color ?? FINANCIAL_CATEGORY_COLOR_PRESETS[0],
      sort_order: category.sort_order,
    });
    setDialogOpen(true);
  }

  const grouped = groupCategoriesByType(categories.data ?? []);
  const hasAny = (categories.data?.length ?? 0) > 0;

  return (
    <FinancePanelGate
      clinicId={clinicId}
      clinicLoading={clinicLoading}
      loading={categories.isLoading}
      error={categories.error}
      onRetry={() => categories.refetch()}
      loadingLabel="Carregando categorias…"
      errorFallback="Não foi possível carregar as categorias."
    >
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Organize receitas e despesas da clínica. Categorias inativas não aparecem em novos cadastros futuros.
        </p>
        <div className="flex flex-wrap gap-2">
          <SupportGuardButton
            variant="outline"
            supportMode={supportMode}
            onClick={() => seedDefaults.mutate()}
            tooltip="Sugerir categorias bloqueado no Modo Suporte"
            disabled={seedDefaults.isPending}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Sugerir padrão
          </SupportGuardButton>
          <SupportGuardButton
            supportMode={supportMode}
            onClick={() => openCreate()}
            tooltip="Nova categoria bloqueada no Modo Suporte"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova categoria
          </SupportGuardButton>
        </div>
      </div>

      {!hasAny ? (
        <EmptyState
          icon={FolderTree}
          title="Nenhuma categoria cadastrada"
          description="Comece com o plano sugerido ou crie categorias personalizadas para receitas e despesas."
          action={{ label: "Sugerir categorias padrão", onClick: () => seedDefaults.mutate() }}
        />
      ) : (
        <>
          <CategoryGroup
            title={FINANCIAL_CATEGORY_TYPE_PLURAL.income}
            type="income"
            items={grouped.income}
            supportMode={supportMode}
            onEdit={openEdit}
            onToggle={(id, is_active) => toggleActive.mutate({ id, is_active })}
            onAdd={() => openCreate("income")}
          />
          <CategoryGroup
            title={FINANCIAL_CATEGORY_TYPE_PLURAL.expense}
            type="expense"
            items={grouped.expense}
            supportMode={supportMode}
            onEdit={openEdit}
            onToggle={(id, is_active) => toggleActive.mutate({ id, is_active })}
            onAdd={() => openCreate("expense")}
          />
        </>
      )}

      <CategoryDialog
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
    </FinancePanelGate>
  );
}

type CategoryGroupProps = {
  title: string;
  type: FinancialCategoryType;
  items: FinancialCategoryRow[];
  supportMode: boolean;
  onEdit: (c: FinancialCategoryRow) => void;
  onToggle: (id: string, is_active: boolean) => void;
  onAdd: () => void;
};

function CategoryGroup({ title, type, items, supportMode, onEdit, onToggle, onAdd }: CategoryGroupProps) {
  return (
    <PageSection
      title={title}
      description={`Categorias de ${FINANCIAL_CATEGORY_TYPE_LABELS[type].toLowerCase()} — ordem e cor opcional.`}
      actions={
        <SupportGuardButton
          size="sm"
          variant="outline"
          supportMode={supportMode}
          onClick={onAdd}
          tooltip="Nova categoria bloqueada no Modo Suporte"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Adicionar
        </SupportGuardButton>
      }
    >
      {items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma categoria de {FINANCIAL_CATEGORY_TYPE_LABELS[type].toLowerCase()} ainda.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {items.map((item) => (
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
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Ordem {item.sort_order}
                      {!item.is_active && " · Inativa"}
                    </p>
                  </div>
                  {!item.is_active && (
                    <Badge variant="outline" className="shrink-0">
                      Inativa
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <div className="flex items-center gap-2 pr-2">
                    <Label htmlFor={`active-${item.id}`} className="text-xs text-muted-foreground">
                      Ativa
                    </Label>
                    <Switch
                      id={`active-${item.id}`}
                      checked={item.is_active}
                      disabled={supportMode}
                      onCheckedChange={(checked) => onToggle(item.id, checked)}
                    />
                  </div>
                  <SupportGuardButton
                    size="sm"
                    variant="outline"
                    supportMode={supportMode}
                    onClick={() => onEdit(item)}
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
      )}
    </PageSection>
  );
}

type CategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CategoryForm;
  setForm: (form: CategoryForm) => void;
  editing: FinancialCategoryRow | null;
  onSubmit: () => void;
  pending: boolean;
  supportMode: boolean;
};

function CategoryDialog({
  open,
  onOpenChange,
  form,
  setForm,
  editing,
  onSubmit,
  pending,
  supportMode,
}: CategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase">Nome</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex.: Consultas"
              disabled={supportMode}
              maxLength={80}
            />
          </div>
          <div>
            <Label className="text-xs uppercase">Tipo</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v as FinancialCategoryType })}
              disabled={supportMode || !!editing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">{FINANCIAL_CATEGORY_TYPE_PLURAL.income}</SelectItem>
                <SelectItem value="expense">{FINANCIAL_CATEGORY_TYPE_PLURAL.expense}</SelectItem>
              </SelectContent>
            </Select>
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
