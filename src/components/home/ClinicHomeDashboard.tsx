import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileText,
  Sparkles,
  Stethoscope,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import {
  EmptyState,
  InfoCard,
  KpiCard,
  KpiGrid,
  PageSection,
  StatusBadge,
} from "@/components/layout";
import {
  ActionButton,
  ModuleStack,
  PageHero,
  QuickAction,
} from "@/components/ui-system";
import type { AttentionItem } from "@/components/dashboard";
import { ClinicActivationCenter } from "@/components/clinic-activation-center";
import { fmtDate, brl } from "@/lib/format";
import { appointmentStatusLabel } from "@/lib/appointment-status";
import { cn } from "@/lib/utils";

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
  attentionItems: AttentionItem[];
  isNewClinic: boolean;
  logoUploaded: boolean;
};

function PendingChip({
  label,
  value,
  to,
  tone = "default",
}: {
  label: string;
  value: number;
  to: string;
  tone?: "default" | "warning" | "danger";
}) {
  if (value <= 0) return null;
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted/40",
        tone === "warning" && "border-amber-200/80 bg-amber-50/50",
        tone === "danger" && "border-rose-200/80 bg-rose-50/50",
      )}
    >
      <span className="font-medium text-slate-900">{label}</span>
      <StatusBadge variant={tone === "danger" ? "danger" : tone === "warning" ? "warning" : "neutral"}>
        {value}
      </StatusBadge>
    </Link>
  );
}

function ListRowLink({
  title,
  subtitle,
  meta,
  to,
  params,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  to: string;
  params?: Record<string, string>;
}) {
  return (
    <li>
      <Link
        to={to}
        params={params}
        className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/30 sm:px-4"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{title}</p>
          {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
        {meta && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{meta}</span>}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

function WhatToDoNow({ items }: { items: AttentionItem[] }) {
  return (
    <PageSection
      icon={Zap}
      title="O que fazer agora"
      description="Prioridades sugeridas com base na sua rotina de hoje."
      contentClassName="p-0 sm:p-0"
    >
      {items.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Rotina em dia"
          description="Nenhuma pendência urgente. Use as ações rápidas para avançar no atendimento."
          className="py-10"
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {items.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Link
                  to={item.to}
                  className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/30 sm:px-4"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      {item.meta && (
                        <StatusBadge
                          variant={
                            item.tone === "danger" ? "danger" : item.tone === "warning" ? "warning" : "neutral"
                          }
                        >
                          {item.meta}
                        </StatusBadge>
                      )}
                    </div>
                    {item.subtitle && (
                      <p className="mt-0.5 text-xs text-slate-500">{item.subtitle}</p>
                    )}
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageSection>
  );
}

export function ClinicHomeDashboard({
  greeting,
  displayName,
  clinicName,
  dateLabel,
  primaryColor,
  secondaryColor,
  stats,
  attentionItems,
  isNewClinic,
  logoUploaded,
}: ClinicHomeDashboardProps) {
  const reavalCount = stats.reavalPend.length;
  const pendenciasTotal =
    reavalCount + stats.docsRascunho + stats.evolSemAssin + stats.recebiveisVencidos;

  const pacientesDelta =
    stats.pacientesAntes > 0
      ? Math.round(((stats.pacientesAtivos - stats.pacientesAntes) / stats.pacientesAntes) * 100)
      : stats.pacientesAtivos > 0
        ? 100
        : 0;

  const docsDelta =
    stats.docsPrev > 0
      ? Math.round(((stats.docsMes - stats.docsPrev) / stats.docsPrev) * 100)
      : stats.docsMes > 0
        ? 100
        : 0;

  const proximasAcoes = stats.hoje.slice(attentionItems.filter((i) => i.id.startsWith("appt-")).length);

  return (
    <ModuleStack className="space-y-4 sm:space-y-5">
      <PageHero
        greeting={greeting}
        displayName={displayName}
        clinicName={clinicName}
        dateLabel={dateLabel}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        daySummary={[
          { label: "atendimentos hoje", value: stats.atendHoje },
          { label: "pendências", value: pendenciasTotal },
          { label: "na semana", value: stats.agendaSemana },
        ]}
        actions={
          <>
            <ActionButton asChild className="h-9 px-3.5 text-sm" style={{ background: primaryColor }}>
              <Link to="/app/pacientes">
                <Users className="h-4 w-4" />
                Novo paciente
              </Link>
            </ActionButton>
            <ActionButton variant="secondary" asChild className="h-9 px-3.5 text-sm bg-white/90">
              <Link to="/app/agenda">
                <CalendarDays className="h-4 w-4" />
                Agendar
              </Link>
            </ActionButton>
          </>
        }
      />

      {isNewClinic && (
        <InfoCard variant="highlight" hoverable icon={Sparkles} title="Sua clínica está pronta para iniciar" description="Cadastre o primeiro paciente e abra sua agenda.">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link to="/app/pacientes" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
              Cadastrar paciente <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link to="/app/agenda" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
              Abrir agenda <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </InfoCard>
      )}

      <ClinicActivationCenter
        metrics={{
          logoUploaded,
          professionalsCount: stats.profissionais,
          patientsCount: stats.pacientesAtivos,
          assessmentsCount: stats.avaliacoes,
          documentsCount: stats.docsTotal,
          receiptsCount: stats.recibos,
        }}
      />

      <KpiGrid columns={4} className="gap-2.5 lg:gap-3">
        <KpiCard
          icon={CalendarDays}
          label="Agenda de hoje"
          value={stats.atendHoje}
          subtitle={`${stats.agendaSemana} na semana`}
          hideDelta
          variant="premium"
          accent={primaryColor}
        />
        <KpiCard
          icon={Users}
          label="Pacientes ativos"
          value={stats.pacientesAtivos}
          subtitle={pacientesDelta !== 0 ? `${pacientesDelta > 0 ? "+" : ""}${pacientesDelta}% no mês` : "Estável no mês"}
          hideDelta
          variant="premium"
          accent={secondaryColor}
        />
        <KpiCard
          icon={FileText}
          label="Documentos"
          value={stats.docsMes}
          subtitle={docsDelta !== 0 ? `${docsDelta > 0 ? "+" : ""}${docsDelta}% vs mês ant.` : "Emitidos no mês"}
          hideDelta
          variant="premium"
          accent={primaryColor}
        />
        <KpiCard
          icon={DollarSign}
          label="Receita do mês"
          value={stats.receitaMes ? brl(stats.receitaMes) : "—"}
          subtitle={(stats.recebiveisVencidos ?? 0) > 0 ? `${stats.recebiveisVencidos} vencido(s)` : "Financeiro em dia"}
          hideDelta
          variant="premium"
          accent="#059669"
          tone={(stats.recebiveisVencidos ?? 0) > 0 ? "warning" : "default"}
        />
      </KpiGrid>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <WhatToDoNow items={attentionItems} />

        <div className="space-y-4">
          <QuickAction
            items={[
              { label: "Agenda", icon: CalendarDays, to: "/app/agenda" },
              { label: "Pacientes", icon: Users, to: "/app/pacientes" },
              { label: "Financeiro", icon: Wallet, to: "/app/financeiro" },
              { label: "Documentos", icon: FileText, to: "/app/documentos" },
              { label: "Avaliações", icon: Stethoscope, to: "/app/avaliacoes" },
            ]}
          />

          <PageSection
            icon={ClipboardList}
            title="Próximas ações"
            description="Próximos compromissos e follow-ups."
            contentClassName="p-0 sm:p-0"
          >
            {proximasAcoes.length === 0 && stats.reavalPend.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Agenda livre"
                description="Sem próximos compromissos pendentes para hoje."
                action={{ label: "Abrir agenda", to: "/app/agenda" }}
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-border/60">
                {proximasAcoes.map((a) => (
                  <ListRowLink
                    key={a.id}
                    title={a.patients?.nome_completo ?? "Atendimento"}
                    subtitle={`${String(a.horario).slice(0, 5)} · ${a.professionals?.nome ?? "Consulta"}`}
                    meta={appointmentStatusLabel(a.status ?? "")}
                    to="/app/agenda"
                  />
                ))}
                {stats.reavalPend.slice(0, 3).map((r) => (
                  <ListRowLink
                    key={r.id}
                    title={r.patients?.nome_completo ?? "Reavaliação"}
                    subtitle={`Vencida em ${fmtDate(r.scheduled_for)}`}
                    meta="Reavaliação"
                    to="/app/reavaliacoes"
                  />
                ))}
              </ul>
            )}
          </PageSection>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PageSection
          icon={CalendarDays}
          title="Agenda de hoje"
          description="Atendimentos programados para hoje."
          contentClassName="p-0 sm:p-0"
        >
          {stats.hoje.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nenhum atendimento hoje"
              description="Abra a agenda para agendar consultas e sessões."
              action={{ label: "Agendar", to: "/app/agenda" }}
              className="py-8"
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {stats.hoje.map((a) => (
                <ListRowLink
                  key={a.id}
                  title={a.patients?.nome_completo ?? "Atendimento"}
                  subtitle={[String(a.horario).slice(0, 5), a.professionals?.nome].filter(Boolean).join(" · ")}
                  meta={appointmentStatusLabel(a.status ?? "")}
                  to="/app/agenda"
                />
              ))}
            </ul>
          )}
        </PageSection>

        <PageSection
          icon={AlertTriangle}
          title="Pendências"
          description="Itens que precisam de acompanhamento."
          contentClassName="p-3 sm:p-4"
        >
          {pendenciasTotal === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Tudo em dia"
              description="Nenhuma pendência clínica ou financeira no momento."
              className="py-8"
            />
          ) : (
            <div className="grid gap-2">
              <PendingChip label="Reavaliações" value={reavalCount} to="/app/reavaliacoes" tone="warning" />
              <PendingChip label="Documentos em rascunho" value={stats.docsRascunho} to="/app/documentos" tone="warning" />
              <PendingChip label="Evoluções sem assinatura" value={stats.evolSemAssin} to="/app/evolucoes" tone="warning" />
              <PendingChip label="Recebimentos vencidos" value={stats.recebiveisVencidos} to="/app/financeiro/inadimplencia" tone="danger" />
            </div>
          )}
        </PageSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PageSection
          icon={FileText}
          title="Documentos recentes"
          description="Últimos documentos emitidos na clínica."
          contentClassName="p-0 sm:p-0"
        >
          {stats.recentDocs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Sem documentos recentes"
              description="Os documentos emitidos aparecerão aqui."
              action={{ label: "Ver documentos", to: "/app/documentos" }}
              className="py-8"
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {stats.recentDocs.map((d) => (
                <ListRowLink
                  key={d.id}
                  title={d.title}
                  subtitle={d.patients?.nome_completo ?? "—"}
                  meta={d.locked_at ? fmtDate(d.issued_at) : "Rascunho"}
                  to="/app/documentos"
                />
              ))}
            </ul>
          )}
        </PageSection>

        <PageSection
          icon={Users}
          title="Pacientes recentes"
          description="Últimos cadastros na clínica."
          contentClassName="p-0 sm:p-0"
        >
          {stats.recentPatients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum paciente cadastrado"
              description="Cadastre pacientes para iniciar o atendimento."
              action={{ label: "Novo paciente", to: "/app/pacientes" }}
              className="py-8"
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {stats.recentPatients.map((p) => (
                <ListRowLink
                  key={p.id}
                  title={p.nome_completo}
                  subtitle={p.situacao ?? "ativo"}
                  meta={fmtDate(p.created_at.slice(0, 10))}
                  to="/app/pacientes/$id"
                  params={{ id: p.id }}
                />
              ))}
            </ul>
          )}
        </PageSection>
      </div>
    </ModuleStack>
  );
}
