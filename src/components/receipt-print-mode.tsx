import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  getStoredReceiptPrintMode,
  storeReceiptPrintMode,
  type ReceiptPrintMode,
} from "@/lib/receipt-pdf";

type Props = {
  value?: ReceiptPrintMode;
  onChange?: (mode: ReceiptPrintMode) => void;
  className?: string;
  compact?: boolean;
};

export function ReceiptPrintModeSelector({ value, onChange, className, compact }: Props) {
  const [mode, setMode] = useState<ReceiptPrintMode>(() => value ?? getStoredReceiptPrintMode());

  useEffect(() => {
    if (value !== undefined) setMode(value);
  }, [value]);

  function handleChange(next: ReceiptPrintMode) {
    setMode(next);
    storeReceiptPrintMode(next);
    onChange?.(next);
  }

  return (
    <fieldset className={className}>
      <Label className={`mb-2 block ${compact ? "text-[10px]" : "text-xs"} font-semibold uppercase tracking-wide text-muted-foreground`}>
        Impressão
      </Label>
      <RadioGroup
        value={mode}
        onValueChange={(v) => handleChange(v as ReceiptPrintMode)}
        className={compact ? "gap-1.5" : "gap-2"}
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="a4" id="receipt-print-a4" />
          <Label htmlFor="receipt-print-a4" className="cursor-pointer text-sm font-normal">
            1 recibo por folha
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="economico" id="receipt-print-eco" />
          <Label htmlFor="receipt-print-eco" className="cursor-pointer text-sm font-normal">
            2 recibos por folha (econômico)
          </Label>
        </div>
      </RadioGroup>
    </fieldset>
  );
}
