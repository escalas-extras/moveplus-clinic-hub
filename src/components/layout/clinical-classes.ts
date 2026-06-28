/** Tokens visuais compartilhados entre módulos clínicos premium. */
export const clinical = {
  card: "rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_44px_-36px_rgba(15,23,42,0.55)]",
  cardHover: "transition-shadow hover:shadow-[0_18px_44px_-32px_rgba(15,23,42,0.65)]",
  input:
    "h-11 rounded-xl border-slate-200 bg-slate-50/70 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0",
  select: "rounded-xl focus-visible:ring-2 focus-visible:ring-primary/30",
  btnPrimary:
    "clinical-btn-primary rounded-xl bg-primary px-4 font-semibold text-primary-foreground shadow-soft hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  btnSecondary:
    "clinical-btn-secondary rounded-xl border-slate-200 font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  btnGhost:
    "clinical-btn-ghost rounded-xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  kpiGrid: "grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4",
  splitLayout: "grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]",
  stickyFooter:
    "sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.15)] backdrop-blur sm:px-5",
  focusRing: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
} as const;
