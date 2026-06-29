import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BOLETO_INTEGRATION_NOTICE,
  RECEIVABLE_DISPLAY_STATUS,
  formatPaymentMethod,
  getReceivableDisplayStatus,
  receivableDisplayStatusVariant,
  type ReceivableRow,
} from "@/lib/finance";
import { brl, fmtDate } from "@/lib/format";
import { StatusBadge } from "@/components/layout/StatusBadge";

type FinanceReceivableDetailDialogProps = {
  row: ReceivableRow | null;
  onClose: () => void;
};

export function FinanceReceivableDetailDialog({ row, onClose }: FinanceReceivableDetailDialogProps) {
  const open = !!row;
  if (!row) return null;

  const displayStatus = getReceivableDisplayStatus(row);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhe do recebimento</DialogTitle>
        </DialogHeader>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <DetailItem label="Paciente" value={row.patients?.nome_completo ?? "—"} />
          <DetailItem label="Profissional" value={row.professionals?.nome ?? "—"} />
          <DetailItem label="Valor" value={brl(row.valor)} />
          <DetailItem label="Vencimento" value={fmtDate(row.data_vencimento ?? row.data)} />
          <DetailItem label="Emissão" value={fmtDate(row.data)} />
          <DetailItem label="Forma de recebimento" value={formatPaymentMethod(row.forma_pagamento)} />
          <DetailItem
            label="Status"
            value={
              <StatusBadge variant={receivableDisplayStatusVariant(displayStatus)}>
                {RECEIVABLE_DISPLAY_STATUS[displayStatus]}
              </StatusBadge>
            }
          />
          {row.data_recebimento && (
            <DetailItem label="Data do recebimento" value={fmtDate(row.data_recebimento)} />
          )}
          {row.pix_chave && <DetailItem label="Chave PIX" value={row.pix_chave} />}
          {row.recebido_por && <DetailItem label="Recebido por" value={row.recebido_por} />}
          {row.boleto_nosso_numero && (
            <DetailItem label="Nosso número" value={row.boleto_nosso_numero} />
          )}
          {row.boleto_link && (
            <DetailItem
              label="Link do boleto"
              value={
                <a href={row.boleto_link} target="_blank" rel="noreferrer" className="text-primary underline">
                  Abrir boleto
                </a>
              }
            />
          )}
          {row.comprovante_url && (
            <DetailItem
              label="Comprovante"
              value={
                <a href={row.comprovante_url} target="_blank" rel="noreferrer" className="text-primary underline">
                  Ver comprovante
                </a>
              }
            />
          )}
          {row.documento && <DetailItem label="Documento" value={row.documento} />}
          {row.observacoes && (
            <div className="sm:col-span-2">
              <DetailItem label="Observações" value={row.observacoes} />
            </div>
          )}
        </dl>
        {row.forma_pagamento === "boleto" && (
          <p className="mt-2 rounded-lg border border-amber-200/80 bg-amber-50/80 p-3 text-xs text-amber-900">
            {BOLETO_INTEGRATION_NOTICE}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <div className="mt-0.5 font-medium text-foreground">{value}</div>
    </div>
  );
}
