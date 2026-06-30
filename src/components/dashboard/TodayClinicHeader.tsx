import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOS_TITLE_PAGE, FOS_EYEBROW } from "@/components/ui-system/tokens";

type TodayClinicHeaderProps = {
  greeting: string;
  displayName?: string;
  clinicName: string;
  dateLabel: string;
  appointmentsToday: number;
  primaryColor?: string;
  className?: string;
};

function pluralAtendimentos(n: number) {
  if (n === 1) return "1 atendimento agendado";
  return `${n} atendimentos agendados`;
}

export function TodayClinicHeader({
  greeting,
  displayName,
  clinicName,
  dateLabel,
  appointmentsToday,
  primaryColor = "var(--fos-primary)",
  className,
}: TodayClinicHeaderProps) {
  const heading = displayName ? `${greeting}, ${displayName}.` : `${greeting}.`;
  const summary =
    appointmentsToday > 0
      ? `Hoje você possui ${pluralAtendimentos(appointmentsToday)}.`
      : "Sua agenda está livre hoje — aproveite para organizar a clínica.";

  return (
    <header
      className={cn(
        "today-clinic-header fos-animate-in relative overflow-hidden rounded-3xl border border-[rgba(15,76,92,0.1)] bg-white/90 px-5 py-6 shadow-[var(--fos-card-shadow)] backdrop-blur-sm sm:px-7 sm:py-7",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full opacity-[0.08] blur-3xl"
        style={{ background: primaryColor }}
      />
      <div className="relative space-y-3">
        <p className={FOS_EYEBROW} style={{ color: primaryColor }}>
          Hoje na clínica · {clinicName}
        </p>
        <h1 className={cn(FOS_TITLE_PAGE, "text-2xl sm:text-3xl lg:text-[2rem]")}>{heading}</h1>
        <p className="flex items-center gap-2 text-sm capitalize text-slate-600 sm:text-base">
          <CalendarDays className="h-4 w-4 shrink-0" style={{ color: primaryColor }} aria-hidden />
          {dateLabel}.
        </p>
        <p
          className="max-w-2xl text-base font-medium leading-relaxed text-slate-800 sm:text-lg"
          style={{ color: appointmentsToday > 0 ? undefined : "var(--fos-muted-foreground, #64748b)" }}
        >
          {summary}
        </p>
      </div>
    </header>
  );
}
