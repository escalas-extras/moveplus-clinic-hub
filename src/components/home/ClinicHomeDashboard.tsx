import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { InfoCard, EmptyState } from "@/components/layout";
import { ModuleStack } from "@/components/ui-system";
import { ClinicActivationCenter } from "@/components/clinic-activation-center";
import { TodayClinicHeader } from "@/components/dashboard/TodayClinicHeader";
import { TodayPremiumCards } from "@/components/dashboard/TodayPremiumCards";
import { NextAppointmentsSection } from "@/components/dashboard/NextAppointmentsSection";
import { TodayQuickActions } from "@/components/dashboard/TodayQuickActions";
import { TodayAlerts } from "@/components/dashboard/TodayAlerts";
import { ContinueWhereLeftOff } from "@/components/dashboard/ContinueWhereLeftOff";

export type ClinicHomeAppt = {
  id: string;
  data?: string;
  horario: string;
  status: string | null;
  observacao: string | null;
  patients: { nome_completo: string } | null;
  professionals: { nome: string } | null;
};

export type ClinicHomeReaval = {
  id: string;
  patient_id: string;
  scheduled_for: string;
  patients: { nome_completo: string } | null;
};

export type ClinicHomeDoc = {
  id: string;
  title: string;
  doc_type: string;
  issued_at: string;
  locked_at: string | null;
  patients: { nome_completo: string } | null;
};

export type ClinicHomePatient = {
  id: string;
  nome_completo: string;
  created_at: string;
  situacao: string | null;
};

export type ClinicHomeStats = {
  pacientesAtivos: number;
  pacientesAntes: number;
  atendHoje: number;
  agendaSemana: number;
  docsMes: number;
  docsPrev: number;
  docsTotal: number;
  profissionais: number;
  avaliacoes: number;
  recibos: number;
  reavalPend: ClinicHomeReaval[];
  docsRascunho: number;
  evolSemAssin: number;
  hoje: ClinicHomeAppt[];
  receitaMes: number;
  recebiveisVencidos: number;
  recentDocs: ClinicHomeDoc[];
  recentPatients: ClinicHomePatient[];
};

type ClinicHomeDashboardProps = {
  greeting: string;
  displayName?: string;
  clinicName: string;
  dateLabel: string;
  primaryColor: string;
  secondaryColor: string;
  stats: ClinicHomeStats;
  isNewClinic: boolean;
  logoUploaded: boolean;
  loadingDetails?: boolean;
};

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: number | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function uniquePatientsToday(appointments: ClinicHomeAppt[]): number {
  const names = new Set(
    appointments
      .map((a) => a.patients?.nome_completo?.trim())
      .filter(Boolean),
  );
  return names.size;
}

export function ClinicHomeDashboard({
  greeting,
  displayName,
  clinicName,
  dateLabel,
  primaryColor,
  secondaryColor,
  stats,
  isNewClinic,
  logoUploaded,
  loadingDetails = false,
}: ClinicHomeDashboardProps) {
  const safe = {
    pacientesAtivos: asNumber(stats.pacientesAtivos),
    atendHoje: asNumber(stats.atendHoje),
    agendaSemana: asNumber(stats.agendaSemana),
    profissionais: asNumber(stats.profissionais),
    avaliacoes: asNumber(stats.avaliacoes),
    docsTotal: asNumber(stats.docsTotal),
    recibos: asNumber(stats.recibos),
    reavalPend: asArray(stats.reavalPend),
    docsRascunho: asNumber(stats.docsRascunho),
    evolSemAssin: asNumber(stats.evolSemAssin),
    hoje: asArray(stats.hoje),
    recebiveisVencidos: asNumber(stats.recebiveisVencidos),
    recentDocs: asArray(stats.recentDocs),
    recentPatients: asArray(stats.recentPatients),
  };

  const patientsToday = uniquePatientsToday(safe.hoje);
  const pendenciasTotal =
    safe.reavalPend.length + safe.docsRascunho + safe.evolSemAssin + safe.recebiveisVencidos;

  if (isNewClinic && safe.pacientesAtivos === 0) {
    return (
      <ModuleStack className="space-y-5">
        <TodayClinicHeader
          greeting={greeting}
          displayName={displayName}
          clinicName={clinicName}
          dateLabel={dateLabel}
          appointmentsToday={0}
          primaryColor={primaryColor}
        />
        <EmptyState
          icon={Sparkles}
          title="Você ainda não possui pacientes cadastrados"
          description="Comece cadastrando seu primeiro paciente e abrindo a agenda. Em poucos minutos sua clínica estará pronta para atender."
          action={{ label: "Cadastrar primeiro paciente", to: "/app/pacientes" }}
          className="rounded-3xl border border-[rgba(15,76,92,0.08)] bg-white/90 py-16"
        />
        <TodayQuickActions />
      </ModuleStack>
    );
  }

  return (
    <ModuleStack className="today-clinic-dashboard space-y-5 sm:space-y-6">
      <TodayClinicHeader
        greeting={greeting}
        displayName={displayName}
        clinicName={clinicName}
        dateLabel={dateLabel}
        appointmentsToday={safe.atendHoje}
        primaryColor={primaryColor}
      />

      <TodayPremiumCards
        patientsToday={patientsToday}
        appointmentsToday={safe.atendHoje}
        weekAppointments={safe.agendaSemana}
        receivablesOverdue={safe.recebiveisVencidos}
        pendingTotal={pendenciasTotal}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <NextAppointmentsSection
          items={safe.hoje}
          accent={primaryColor}
          loading={loadingDetails}
        />
        <TodayQuickActions />
      </div>

      <TodayAlerts
        reevaluations={safe.reavalPend.length}
        patientsWithoutReturn={0}
        pendingDocuments={safe.docsRascunho}
        overdueReceivables={safe.recebiveisVencidos}
      />

      <ContinueWhereLeftOff
        lastPatient={safe.recentPatients[0] ?? null}
        lastDocument={safe.recentDocs[0] ?? null}
        unsignedEvolutions={safe.evolSemAssin}
      />

      {isNewClinic && (
        <InfoCard variant="highlight" hoverable icon={Sparkles} title="Sua clínica está ganhando forma" description="Complete os passos abaixo para deixar tudo pronto.">
          <Link to="/app/pacientes" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            Ver pacientes <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </InfoCard>
      )}

      <ClinicActivationCenter
        metrics={{
          logoUploaded,
          professionalsCount: safe.profissionais,
          patientsCount: safe.pacientesAtivos,
          assessmentsCount: safe.avaliacoes,
          documentsCount: safe.docsTotal,
          receiptsCount: safe.recibos,
        }}
      />
    </ModuleStack>
  );
}
