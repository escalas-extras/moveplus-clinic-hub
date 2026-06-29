import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

type AdminSaasShellProps = {
  children: ReactNode;
};

/**
 * Structural boundary for the SaaS platform area.
 *
 * The visual frame is still reused from the existing application shell to avoid
 * layout drift; this wrapper gives Admin SaaS its own shell ownership point.
 */
export function AdminSaasShell({ children }: AdminSaasShellProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <div data-shell="admin-saas">{children}</div>
    </TooltipProvider>
  );
}
