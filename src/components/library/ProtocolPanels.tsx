import {
  ArrowDown,
  ArrowUp,
  Archive,
  ClipboardList,
  Copy,
  GripVertical,
  Pencil,
  Save,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageSection } from "@/components/layout";
import type { ProtocolDraftItem } from "@/features/library/types";

type Props = {
  items: ProtocolDraftItem[];
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (exerciseId: string) => void;
  onDuplicate: (exerciseId: string) => void;
  onSave: () => void;
  saving?: boolean;
};

export function ProtocolBuilderPanel({
  items,
  onMove,
  onRemove,
  onDuplicate,
  onSave,
  saving,
}: Props) {
  return (
    <PageSection icon={ClipboardList} title="Protocolo atual" description="Monte, ordene e salve." contentClassName="space-y-3">
      {items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Adicione exercícios"
          description="Use o botão Adicionar nos cards para montar um protocolo."
          className="py-7"
        />
      ) : (
        <ol className="space-y-2">
          {items.map((item, index) => (
            <li key={`${item.exercise.id}-${index}`} className="rounded-2xl border bg-white p-3 shadow-sm">
              <div className="flex items-start gap-2">
                <GripVertical className="mt-1 h-4 w-4 shrink-0 text-slate-300" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{index + 1}. {item.exercise.name}</p>
                  <p className="truncate text-xs text-slate-500">{item.exercise.body_region ?? "Exercício"}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" className="h-7 rounded-lg px-2" onClick={() => onMove(index, -1)} disabled={index === 0}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 rounded-lg px-2" onClick={() => onMove(index, 1)} disabled={index === items.length - 1}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 rounded-lg px-2" onClick={() => onDuplicate(item.exercise.id)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 rounded-lg px-2 text-rose-600 hover:text-rose-700" onClick={() => onRemove(item.exercise.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <Button className="w-full rounded-xl" onClick={onSave} disabled={items.length === 0 || saving}>
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Salvando..." : "Salvar protocolo"}
      </Button>
    </PageSection>
  );
}

type ProtocolCardProps = {
  name: string;
  description: string | null;
  itemCount: number;
  favorite: boolean;
  onFavorite: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
};

export function ProtocolCard({
  name,
  description,
  itemCount,
  favorite,
  onFavorite,
  onEdit,
  onDuplicate,
  onArchive,
}: ProtocolCardProps) {
  return (
    <article className="rounded-3xl border border-[rgba(15,76,92,0.1)] bg-white p-4 shadow-[var(--fos-card-shadow)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-slate-950">{name}</h3>
          {description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{description}</p>}
          <p className="mt-2 text-xs text-slate-500">{itemCount} exercício(s)</p>
        </div>
        <button type="button" onClick={onFavorite} className="shrink-0 text-slate-400 hover:text-amber-500" aria-label="Favoritar protocolo">
          {favorite ? <Star className="h-5 w-5 fill-amber-400 text-amber-400" /> : <StarOff className="h-5 w-5" />}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="rounded-xl" onClick={onEdit}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Editar
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl" onClick={onDuplicate}>
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Duplicar
        </Button>
        <Button size="sm" variant="ghost" className="rounded-xl text-rose-600" onClick={onArchive}>
          <Archive className="mr-1.5 h-3.5 w-3.5" />
          Arquivar
        </Button>
      </div>
    </article>
  );
}
