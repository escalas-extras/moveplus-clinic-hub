import type { ReactNode } from "react";

import { cn } from "@/lib/utils";



type FormGridProps = {

  children: ReactNode;

  className?: string;

  /** Colunas em telas sm+ (padrão 2). */

  cols?: 1 | 2 | 3;

};



const colClass: Record<1 | 2 | 3, string> = {

  1: "grid-cols-1",

  2: "sm:grid-cols-2",

  3: "sm:grid-cols-2 lg:grid-cols-3",

};



export function FormGrid({ children, className, cols = 2 }: FormGridProps) {

  return (

    <div className={cn("fos-form-grid grid w-full min-w-0 gap-4", colClass[cols], className)}>{children}</div>

  );

}


