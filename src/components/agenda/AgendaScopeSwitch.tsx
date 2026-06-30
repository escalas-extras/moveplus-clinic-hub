import { Building2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  scope: "clinic" | "professional";
  onScopeChange: (scope: "clinic" | "professional") => void;
  professionals: Array<{ id: string; nome: string }>;
  selectedProfessionalId: string;
  onProfessionalChange: (id: string) => void;
};

export function AgendaScopeSwitch({
  scope,
  onScopeChange,
  professionals,
  selectedProfessionalId,
  onProfessionalChange,
}: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[rgba(15,76,92,0.1)] bg-white/90 p-3 shadow-[var(--fos-card-shadow)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex rounded-xl bg-slate-100 p-1">
        <ScopeButton
          active={scope === "clinic"}
          icon={Building2}
          label="Agenda da clínica"
          onClick={() => onScopeChange("clinic")}
        />
        <ScopeButton
          active={scope === "professional"}
          icon={UserRound}
          label="Agenda do profissional"
          onClick={() => onScopeChange("professional")}
        />
      </div>
      {scope === "professional" && (
        <Select value={selectedProfessionalId} onValueChange={onProfessionalChange}>
          <SelectTrigger className="h-10 w-full rounded-xl sm:w-[240px]">
            <SelectValue placeholder="Selecione o profissional" />
          </SelectTrigger>
          <SelectContent>
            {professionals.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function ScopeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Building2;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition sm:flex-none sm:px-4 sm:text-sm",
        active ? "bg-white text-primary shadow-sm" : "text-slate-600 hover:text-slate-900",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </button>
  );
}
