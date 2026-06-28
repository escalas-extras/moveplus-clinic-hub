import { forwardRef } from "react";
import {
  PrimaryActionButton,
  SecondaryActionButton,
  OutlineActionButton,
  GhostActionButton,
  DangerActionButton,
} from "@/components/layout";

export type ActionButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";

export type ActionButtonProps = React.ComponentProps<typeof PrimaryActionButton> & {
  variant?: ActionButtonVariant;
};

/** Botão de ação unificado — mesmos estilos em todo o FisioOS. */
export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ variant = "primary", ...props }, ref) => {
    switch (variant) {
      case "secondary":
        return <SecondaryActionButton ref={ref} {...props} />;
      case "outline":
        return <OutlineActionButton ref={ref} {...props} />;
      case "ghost":
        return <GhostActionButton ref={ref} {...props} />;
      case "danger":
        return <DangerActionButton ref={ref} {...props} />;
      default:
        return <PrimaryActionButton ref={ref} {...props} />;
    }
  },
);
ActionButton.displayName = "ActionButton";

export {
  PrimaryActionButton,
  SecondaryActionButton,
  OutlineActionButton,
  GhostActionButton,
  DangerActionButton,
};
