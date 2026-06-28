import { memo } from "react";
import { InfoCard } from "@/components/layout";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { DischargeChecklist } from "./discharge-utils";

const ITEMS: { key: keyof DischargeChecklist; label: string; hint?: string }[] = [
  { key: "objetivosConcluidos", label: "Objetivos concluídos", hint: "Metas terapêuticas revisadas e documentadas" },
  { key: "orientacoesEntregues", label: "Orientações entregues", hint: "Paciente/familiar ciente das recomendações" },
  { key: "exerciciosDomiciliares", label: "Exercícios domiciliares", hint: "Plano domiciliar orientado e registrado" },
  { key: "encaminhamento", label: "Encaminhamento (quando existir)", hint: "Marcar se houve encaminhamento" },
  { key: "documentacaoCompleta", label: "Documentação completa", hint: "Prontuário, evoluções e avaliações em dia" },
];

type DischargeChecklistPanelProps = {
  value: DischargeChecklist;
  onChange: (next: DischargeChecklist) => void;
  readOnly?: boolean;
};

function DischargeChecklistPanelInner({ value, onChange, readOnly }: DischargeChecklistPanelProps) {
  const done = ITEMS.filter((i) => value[i.key]).length;

  return (
    <InfoCard
      title="Checklist clínico"
      description={`${done} de ${ITEMS.length} itens verificados antes da alta.`}
    >
      <ul className="space-y-3">
        {ITEMS.map((item) => (
          <li key={item.key}>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200/80 p-3 transition-colors",
                value[item.key] && "border-emerald-200 bg-emerald-50/40",
                readOnly && "cursor-default",
              )}
            >
              <Checkbox
                checked={value[item.key]}
                disabled={readOnly}
                onCheckedChange={(c) => onChange({ ...value, [item.key]: c === true })}
                className="mt-0.5"
                aria-label={item.label}
              />
              <div>
                <Label className="cursor-pointer text-sm font-semibold text-slate-900">{item.label}</Label>
                {item.hint && <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>}
              </div>
            </label>
          </li>
        ))}
      </ul>
    </InfoCard>
  );
}

export const DischargeChecklistPanel = memo(DischargeChecklistPanelInner);

export function isChecklistComplete(c: DischargeChecklist, hasEncaminhamento: boolean) {
  const required: (keyof DischargeChecklist)[] = [
    "objetivosConcluidos",
    "orientacoesEntregues",
    "exerciciosDomiciliares",
    "documentacaoCompleta",
  ];
  if (hasEncaminhamento) required.push("encaminhamento");
  return required.every((k) => c[k]);
}
