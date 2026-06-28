import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FOS_STACK } from "./tokens";

type ModuleStackProps = {
  children: ReactNode;
  className?: string;
};

/** Stack vertical padronizado entre blocos de uma página. */
export function ModuleStack({ children, className }: ModuleStackProps) {
  return <div className={cn(FOS_STACK, className)}>{children}</div>;
}
