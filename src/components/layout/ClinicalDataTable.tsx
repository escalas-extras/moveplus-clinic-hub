import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { clinical } from "./clinical-classes";

type ClinicalDataTableProps = {
  children: ReactNode;
  minWidth?: number;
  className?: string;
};

function ClinicalDataTableInner({ children, minWidth = 640, className }: ClinicalDataTableProps) {
  return (
    <div className={cn(clinical.tableWrap, "fos-table-wrap", className)}>
      <div className="fos-table-scroll" style={{ minWidth }}>
        {children}
      </div>
    </div>
  );
}

export const ClinicalDataTable = memo(ClinicalDataTableInner);
