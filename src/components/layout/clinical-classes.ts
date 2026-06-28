/** Tokens visuais FisioOS Premium — Sprint B Design System. */
export const clinical = {
  card: "fos-surface-card rounded-2xl",
  cardHover:
    "transition-[box-shadow,transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[rgba(15,76,92,0.22)] hover:shadow-[var(--shadow-lift)]",
  infoCard:
    "fos-info-card fos-surface-card rounded-2xl transition-[box-shadow,transform,border-color] duration-200 ease-out",
  infoCardHighlight: "fos-info-card fos-info-card--highlight",
  pageSection: "fos-page-section fos-surface-card rounded-2xl overflow-hidden",
  pageSectionHeader: "fos-page-section__header",
  pageSectionBody: "fos-page-section__body",
  field:
    "fos-field block w-full min-w-0 max-w-full box-border rounded-xl border border-[rgba(15,76,92,0.28)] bg-[#eef3f6] px-3.5 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgba(15,76,92,0.06)] transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-slate-400/90 hover:border-[rgba(15,76,92,0.4)] hover:bg-[#e8eef2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:border-primary/55 focus-visible:bg-white disabled:cursor-not-allowed disabled:opacity-55 disabled:bg-slate-100 aria-[invalid=true]:border-destructive/70 aria-[invalid=true]:ring-destructive/20 data-[success=true]:border-emerald-500/50 data-[success=true]:ring-emerald-500/20",
  input: "fos-field h-11",
  textarea:
    "fos-field w-full min-w-0 min-h-[5.5rem] py-3 leading-relaxed resize-y break-words",
  select:
    "fos-field flex h-11 w-full min-w-0 max-w-full items-center justify-between gap-2 px-3.5 data-[placeholder]:text-slate-400",
  kpiGrid: "grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4",
  kpiCard: "fos-kpi-card fos-surface-kpi rounded-2xl fos-animate-in",
  splitLayout: "grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]",
  stickyFooter:
    "sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[rgba(15,76,92,0.14)] bg-white/95 p-3 shadow-[0_-8px_24px_-12px_rgba(15,76,92,0.14)] backdrop-blur sm:px-5",
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
  btnPrimary:
    "fos-btn clinical-btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-[transform,box-shadow,background-color] duration-200 hover:bg-primary/92 hover:shadow-[var(--shadow-lift)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50",
  btnSecondary:
    "fos-btn clinical-btn-secondary inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[rgba(15,76,92,0.18)] bg-white/90 px-5 text-sm font-semibold text-primary shadow-sm transition-[transform,box-shadow,background-color,border-color] duration-200 hover:bg-slate-50 hover:border-[rgba(15,76,92,0.28)] hover:-translate-y-px active:translate-y-0",
  btnOutline:
    "fos-btn inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[rgba(15,76,92,0.2)] bg-transparent px-5 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:bg-white/90 hover:border-[rgba(15,76,92,0.3)] hover:-translate-y-px",
  btnGhost:
    "fos-btn clinical-btn-ghost inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-[rgba(15,76,92,0.06)]",
  btnDanger:
    "fos-btn inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-destructive px-5 text-sm font-semibold text-destructive-foreground shadow-sm transition-all duration-200 hover:bg-destructive/92 hover:-translate-y-px",
  tableWrap: "fos-table-wrap overflow-x-auto rounded-xl border border-[rgba(15,76,92,0.12)] bg-white/80 shadow-[0_1px_2px_rgba(15,76,92,0.04)]",
  emptyState: "fos-empty-state",
  skeleton: "fos-skeleton",
  formSection: "fos-form-section",
  uploadZone:
    "fos-upload-zone flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[rgba(15,76,92,0.18)] bg-[rgba(15,76,92,0.02)] px-6 py-8 text-center transition-[border-color,background-color,box-shadow] duration-200 hover:border-[rgba(15,76,92,0.28)] hover:bg-[rgba(15,76,92,0.04)] focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20",
  checkbox:
    "fos-form-checkbox peer h-[1.125rem] w-[1.125rem] shrink-0 rounded-md border border-[rgba(15,76,92,0.22)] shadow-sm transition-[border-color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
  switch:
    "fos-form-switch peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-200",
  radio:
    "fos-form-radio aspect-square h-[1.125rem] w-[1.125rem] rounded-full border border-[rgba(15,76,92,0.22)] text-primary shadow-sm transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50",
  clinicalDialog:
    "fos-clinical-dialog flex h-[min(88vh,920px)] w-[min(90vw,1200px)] max-w-none translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl",
  clinicalDialogHeader:
    "fos-clinical-dialog__header shrink-0 space-y-1 border-b border-[rgba(15,76,92,0.1)] bg-white px-6 pb-4 pt-6 text-left sm:pr-14",
  clinicalDialogBody: "fos-clinical-dialog__body min-h-0 flex-1 overflow-y-auto px-6 py-5",
  clinicalDialogFooter:
    "fos-clinical-dialog__footer shrink-0 flex-col-reverse gap-2 border-t border-[rgba(15,76,92,0.1)] bg-white/95 px-6 py-4 sm:flex-row sm:justify-end sm:space-x-2",
} as const;
