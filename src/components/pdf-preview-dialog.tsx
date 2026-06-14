import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, Loader2 } from "lucide-react";
import { buildPdf, downloadPdf, printPdf } from "@/lib/pdf";

type PdfOpts = Parameters<typeof buildPdf>[0];

export function PdfPreviewDialog({
  open,
  onOpenChange,
  pdfOpts,
  title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pdfOpts: PdfOpts | null;
  title?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    async function gen() {
      if (!open || !pdfOpts) return;
      setLoading(true);
      try {
        const doc = await buildPdf(pdfOpts);
        const blobUrl = URL.createObjectURL(doc.output("blob"));
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        revoke = blobUrl;
        setUrl(blobUrl);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    gen();
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
      setUrl(null);
    };
  }, [open, pdfOpts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between space-y-0">
          <DialogTitle>{title || pdfOpts?.title || "Pré-visualização do PDF"}</DialogTitle>
          <div className="flex gap-2 mr-8">
            <Button
              size="sm"
              variant="outline"
              disabled={!pdfOpts}
              onClick={() => pdfOpts && downloadPdf(pdfOpts)}
            >
              <FileDown className="h-4 w-4 mr-1" />
              Baixar
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!pdfOpts}
              onClick={() => pdfOpts && printPdf(pdfOpts)}
            >
              <Printer className="h-4 w-4 mr-1" />
              Imprimir
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 bg-muted overflow-hidden">
          {loading || !url ? (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Gerando pré-visualização…
            </div>
          ) : (
            <iframe
              src={url}
              title="Pré-visualização do PDF"
              className="w-full h-full border-0"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
