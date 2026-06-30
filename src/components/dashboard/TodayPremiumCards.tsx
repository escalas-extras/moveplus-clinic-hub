import {
  AlertTriangle,
  CalendarDays,
  Users,
  Wallet,
} from "lucide-react";
import { OperationalCard, OperationalCardsGrid } from "@/components/dashboard/OperationalCard";

type TodayPremiumCardsProps = {
  patientsToday: number;
  appointmentsToday: number;
  weekAppointments: number;
  receivablesOverdue: number;
  pendingTotal: number;
  primaryColor?: string;
  secondaryColor?: string;
};

export function TodayPremiumCards({
  patientsToday,
  appointmentsToday,
  weekAppointments,
  receivablesOverdue,
  pendingTotal,
  primaryColor = "var(--fos-primary)",
  secondaryColor = "var(--fos-secondary)",
}: TodayPremiumCardsProps) {
  return (
    <OperationalCardsGrid className="grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 fos-animate-in">
      <OperationalCard
        title="Pacientes hoje"
        icon={Users}
        value={patientsToday}
        context={
          patientsToday > 0
            ? "Com atendimento na agenda de hoje"
            : "Nenhum paciente agendado ainda"
        }
        to="/app/pacientes"
        accent={primaryColor}
      />
      <OperationalCard
        title="Agenda"
        icon={CalendarDays}
        value={appointmentsToday}
        context={`${weekAppointments} compromisso(s) na semana`}
        to="/app/agenda"
        accent={secondaryColor}
      />
      <OperationalCard
        title="Recebimentos hoje"
        icon={Wallet}
        value={receivablesOverdue > 0 ? receivablesOverdue : "Em dia"}
        context={
          receivablesOverdue > 0
            ? "Título(s) vencido(s) — toque para receber"
            : "Nenhum vencido · registrar pagamento"
        }
        to="/app/financeiro/receber"
        accent="#059669"
        alert={receivablesOverdue > 0}
      />
      <OperationalCard
        title="Pendências"
        icon={AlertTriangle}
        value={pendingTotal}
        context={
          pendingTotal > 0
            ? "Itens que pedem sua atenção agora"
            : "Tudo em dia na clínica"
        }
        to="/app/reavaliacoes"
        accent="#d97706"
        alert={pendingTotal > 0}
      />
    </OperationalCardsGrid>
  );
}
