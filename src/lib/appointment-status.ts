/** Labels e variantes de status de agendamento — compartilhado entre Painel e Agenda. */

export const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  agendado: "Pendente",
  pendente: "Pendente",
  confirmado: "Confirmado",
  realizado: "Realizado",
  concluido: "Concluído",
  cancelado: "Cancelado",
  faltou: "Faltou",
};

export const APPOINTMENT_STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  agendado: "warning",
  pendente: "warning",
  confirmado: "success",
  realizado: "info",
  concluido: "success",
  cancelado: "danger",
  faltou: "danger",
};

export function appointmentStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return APPOINTMENT_STATUS_LABEL[status] ?? status;
}

export function appointmentStatusVariant(
  status: string | null | undefined,
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (!status) return "neutral";
  return APPOINTMENT_STATUS_VARIANT[status] ?? "neutral";
}
