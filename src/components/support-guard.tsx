import * as React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

const DEFAULT_TOAST = "Modo Suporte ativo: esta ação é somente leitura. Encerre o modo suporte para editar.";
const DEFAULT_TOOLTIP = "Modo Suporte ativo — somente leitura. Encerre a sessão para editar.";

export type SupportGuardButtonProps = React.ComponentProps<typeof Button> & {
  supportMode: boolean;
  tooltip?: string;
  toastMessage?: string;
};

export function SupportGuardButton({
  supportMode,
  tooltip,
  toastMessage,
  children,
  onClick,
  disabled,
  ...props
}: SupportGuardButtonProps) {
  if (!supportMode) {
    return (
      <Button {...props} disabled={disabled} onClick={onClick}>
        {children}
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex cursor-not-allowed rounded-md"
          onClick={() => toast.error(toastMessage || DEFAULT_TOAST)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toast.error(toastMessage || DEFAULT_TOAST);
            }
          }}
        >
          <Button {...props} disabled aria-disabled="true">
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-center">
        <p className="font-medium">{tooltip || DEFAULT_TOOLTIP}</p>
        <p className="text-xs text-muted-foreground mt-1">Clique para ver a mensagem.</p>
      </TooltipContent>
    </Tooltip>
  );
}

export type SupportGuardClickableProps = {
  supportMode: boolean;
  tooltip?: string;
  toastMessage?: string;
  children: React.ReactElement;
  onClick?: () => void;
};

export function SupportGuardClickable({
  supportMode,
  tooltip,
  toastMessage,
  children,
  onClick,
}: SupportGuardClickableProps) {
  const message = toastMessage || DEFAULT_TOAST;
  const tip = tooltip || DEFAULT_TOOLTIP;

  if (!supportMode) {
    return React.cloneElement(children, { onClick });
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex cursor-not-allowed w-full"
          onClick={() => toast.error(message)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toast.error(message);
            }
          }}
        >
          {React.cloneElement(children, {
            disabled: true,
            "aria-disabled": "true",
            tabIndex: -1,
          })}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-center">
        <p className="font-medium">{tip}</p>
        <p className="text-xs text-muted-foreground mt-1">Clique para ver a mensagem.</p>
      </TooltipContent>
    </Tooltip>
  );
}
