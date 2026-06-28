import type { ReactNode } from "react";
import { ModuleStack } from "@/components/ui-system/ModuleStack";

type OpsModuleStackProps = {
  children: ReactNode;
  className?: string;
};

/** @deprecated Use ModuleStack from @/components/ui-system */
export function OpsModuleStack({ children, className }: OpsModuleStackProps) {
  return <ModuleStack className={className}>{children}</ModuleStack>;
}
