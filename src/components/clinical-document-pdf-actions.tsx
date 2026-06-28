import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";
import {
  openArchivedClinicalDocumentPdf,
  previewClinicalDocumentWithCurrentLayout,
  type ClinicalDocumentRow,
} from "@/lib/clinical-document-pdf";

type Props = {
  document: ClinicalDocumentRow;
  patientName?: string | null;
  compact?: boolean;
};

export function ClinicalDocumentPdfActions({ document, patientName, compact = false }: Props) {
  const [busy, setBusy] = useState<"archived" | "preview" | null>(null);

  if (!document.pdf_url) return null;

  const btnClass = compact ? "h-7 text-xs" : undefined;
  const iconClass = compact ? "h-3 w-3" : "h-4 w-4";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className={btnClass}
          disabled={!!busy}
          onClick={async () => {
            setBusy("archived");
            try {
              await openArchivedClinicalDocumentPdf(document.pdf_url!);
            } finally {
              setBusy(null);
            }
          }}
        >
          <Download className={`${iconClass} mr-1`} />
          Abrir PDF arquivado
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className={btnClass}
          disabled={!!busy}
          onClick={async () => {
            setBusy("preview");
            try {
              await previewClinicalDocumentWithCurrentLayout(document, patientName);
            } finally {
              setBusy(null);
            }
          }}
        >
          <Eye className={`${iconClass} mr-1`} />
          Pré-visualizar com layout atual
        </Button>
      </div>
    </div>
  );
}
