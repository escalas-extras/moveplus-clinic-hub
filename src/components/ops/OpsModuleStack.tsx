import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { OPS_STACK } from "./ops-tokens";

type OpsModuleStackProps = {
  children: ReactNode;
  className?: string;
};

/** Espaçamento vertical padronizado entre blocos de uma página operacional. */
export function OpsModuleStack({ children, className }: OpsModuleStackProps) {
  return <div className={cn(OPS_STACK, className)}>{children}</div>;
}
