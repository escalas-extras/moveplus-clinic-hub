import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BOLETO_INTEGRATION_NOTICE,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  type PaymentMethod,
} from "@/lib/finance";

export type ReceivePaymentPayload = {
  receiveDate: string;
  receiveMethod: PaymentMethod;
  pix_chave: string | null;
  comprovante_url: string | null;
  recebido_por: string | null;
  observacao: string | null;
};

type FinanceReceiveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientLabel: string;
  amountLabel: string;
  initialMethod: PaymentMethod;
  onConfirm: (payload: ReceivePaymentPayload) => void;
  pending: boolean;
  supportMode: boolean;
};

export function emptyReceivePayload(method: PaymentMethod, date: string): ReceivePaymentPayload {
  return {
    receiveDate: date,
    receiveMethod: method,
    pix_chave: null,
    comprovante_url: null,
    recebido_por: null,
    observacao: null,
  };
}

export function FinanceReceiveDialog({
  open,
  onOpenChange,
  patientLabel,
  amountLabel,
  initialMethod,
  onConfirm,
  pending,
  supportMode,
}: FinanceReceiveDialogProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<ReceivePaymentPayload>(() =>
    emptyReceivePayload(initialMethod, today),
  );

  useEffect(() => {
    if (open) setForm(emptyReceivePayload(initialMethod, today));
  }, [open, initialMethod, today]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar recebimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {patientLabel} — {amountLabel}
          </p>
          <div>
            <Label className="text-xs uppercase">Data do recebimento</Label>
            <Input
              type="date"
              value={form.receiveDate}
              onChange={(e) => setForm((f) => ({ ...f, receiveDate: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs uppercase">Forma de recebimento</Label>
            <Select
              value={form.receiveMethod}
              onValueChange={(v) => setForm((f) => ({ ...f, receiveMethod: v as PaymentMethod }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.receiveMethod === "pix" && (
            <>
              <div>
                <Label className="text-xs uppercase">Chave PIX (opcional)</Label>
                <Input
                  value={form.pix_chave ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, pix_chave: e.target.value || null }))}
                  placeholder="CPF, e-mail, telefone ou chave aleatória"
                />
              </div>
              <div>
                <Label className="text-xs uppercase">Comprovante (URL, opcional)</Label>
                <Input
                  value={form.comprovante_url ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, comprovante_url: e.target.value || null }))}
                  placeholder="Link ou caminho do comprovante"
                />
              </div>
            </>
          )}

          {form.receiveMethod === "dinheiro" && (
            <div>
              <Label className="text-xs uppercase">Responsável pelo recebimento</Label>
              <Input
                value={form.recebido_por ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, recebido_por: e.target.value || null }))}
                placeholder="Nome de quem recebeu"
              />
            </div>
          )}

          {(form.receiveMethod === "boleto" ||
            form.receiveMethod === "cartao" ||
            form.receiveMethod === "transferencia" ||
            form.receiveMethod === "outro") && (
            <div>
              <Label className="text-xs uppercase">Comprovante (URL, opcional)</Label>
              <Input
                value={form.comprovante_url ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, comprovante_url: e.target.value || null }))}
                placeholder="Link ou caminho do comprovante"
              />
            </div>
          )}

          {form.receiveMethod === "boleto" && (
            <div className="flex gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>{BOLETO_INTEGRATION_NOTICE}</p>
            </div>
          )}

          <div>
            <Label className="text-xs uppercase">Observação (opcional)</Label>
            <Textarea
              rows={2}
              value={form.observacao ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value || null }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button onClick={() => onConfirm(form)} disabled={pending || supportMode || !form.receiveDate}>
            Confirmar recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
