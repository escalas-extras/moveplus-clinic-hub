import { Link } from "@tanstack/react-router";
import { CalendarDays, MessageCircle, Phone } from "lucide-react";
import { StatusBadge } from "@/components/layout";
import { calcAge, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";

type PatientRow = {
  id: string;
  nome_completo: string;
  data_nascimento: string | null;
  telefone: string | null;
  whatsapp: string | null;
  situacao: string;
  data_alta?: string | null;
  sexo?: string | null;
};

type Props = {
  patient: PatientRow;
  lastEvolutionDate?: string | null;
};

function whatsappHref(raw?: string | null) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

function patientInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

export function Patient360Header({ patient, lastEvolutionDate }: Props) {
  const { clinicId } = useActiveClinic();
  const age = calcAge(patient.data_nascimento);
  const isDischarged = !!patient.data_alta;
  const waLink = whatsappHref(patient.whatsapp);

  const nextAppt = useQuery({
    queryKey: ["patient-360-next-appt", clinicId, patient.id],
    enabled: !!clinicId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("appointments")
        .select("id, data, horario, status, professionals(nome)")
        .eq("clinic_id", clinicId!)
        .eq("patient_id", patient.id)
        .gte("data", today)
        .order("data")
        .order("horario")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const nextLabel = nextAppt.data
    ? `${fmtDate(nextAppt.data.data)} · ${String(nextAppt.data.horario).slice(0, 5)}`
    : "Nenhuma sessão agendada";

  return (
    <header className="patient-360-header fos-animate-in overflow-hidden rounded-3xl border border-[rgba(15,76,92,0.1)] bg-white/95 shadow-[var(--fos-card-shadow)]">
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4 sm:gap-5">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-2xl font-bold text-primary ring-2 ring-primary/10 sm:h-24 sm:w-24"
            aria-hidden
          >
            {patientInitials(patient.nome_completo) || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{patient.nome_completo}</h1>
              {isDischarged ? (
                <StatusBadge variant="info">Alta</StatusBadge>
              ) : patient.situacao === "ativo" ? (
                <StatusBadge variant="success">Ativo</StatusBadge>
              ) : (
                <StatusBadge variant="neutral">Inativo</StatusBadge>
              )}
            </div>
            <p className="mt-1.5 text-sm text-slate-600 sm:text-base">
              {age != null ? `${age} anos` : "Idade não informada"}
              {patient.sexo ? ` · ${patient.sexo}` : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {patient.telefone && (
                <a
                  href={`tel:${patient.telefone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-primary/30 hover:text-primary sm:text-sm"
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  {patient.telefone}
                </a>
              )}
              {patient.whatsapp && (
                waLink ? (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 sm:text-sm"
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                    WhatsApp
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 sm:text-sm">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {patient.whatsapp}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[280px]">
          <MetaChip icon={CalendarDays} label="Próxima sessão" value={nextLabel} loading={nextAppt.isLoading} />
          <MetaChip
            icon={CalendarDays}
            label="Última evolução"
            value={lastEvolutionDate ? fmtDate(lastEvolutionDate) : "Nenhuma registrada"}
          />
        </div>
      </div>
    </header>
  );
}

function MetaChip({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3", loading && "animate-pulse")}>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <span className="line-clamp-2">{value}</span>
      </p>
    </div>
  );
}
