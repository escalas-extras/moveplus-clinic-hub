import { CalendarDays, Target, FileText, Wallet } from "lucide-react";
import { OperationalCard, OperationalCardsGrid } from "@/components/dashboard/OperationalCard";

type Props = {
  patientId: string;
  nextSessionLabel: string;
  therapeuticPlan: string | null;
  documentsCount: number;
  financialPendingCount: number;
  onOpenDocuments?: () => void;
};

export function Patient360SummaryCards({
  patientId,
  nextSessionLabel,
  therapeuticPlan,
  documentsCount,
  financialPendingCount,
  onOpenDocuments,
}: Props) {
  return (
    <OperationalCardsGrid className="grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 fos-animate-in">
      <OperationalCard
        title="Próxima sessão"
        icon={CalendarDays}
        value={nextSessionLabel.split(" · ")[1] ?? nextSessionLabel}
        context={nextSessionLabel.includes(" · ") ? nextSessionLabel.split(" · ")[0]! : "Agenda do paciente"}
        to="/app/agenda"
        accent="var(--fos-primary)"
      />
      <OperationalCard
        title="Plano terapêutico"
        icon={Target}
        value={therapeuticPlan ? "Definido" : "Pendente"}
        context={therapeuticPlan ? therapeuticPlan.slice(0, 80) : "Registre na avaliação inicial"}
        static={!therapeuticPlan}
        accent="#6366f1"
        alert={!therapeuticPlan}
      />
      <OperationalCard
        title="Documentos"
        icon={FileText}
        value={documentsCount}
        context={documentsCount > 0 ? "Emitidos para este paciente" : "Nenhum documento ainda"}
        to="/app/documentos"
        onClick={onOpenDocuments}
        accent="#64748b"
      />
      <OperationalCard
        title="Financeiro"
        icon={Wallet}
        value={financialPendingCount > 0 ? financialPendingCount : "Em dia"}
        context={
          financialPendingCount > 0
            ? "Recebimento(s) pendente(s)"
            : "Sem pendências financeiras"
        }
        to="/app/financeiro/receber"
        accent="#059669"
        alert={financialPendingCount > 0}
      />
    </OperationalCardsGrid>
  );
}
