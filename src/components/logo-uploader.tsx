import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  invalidateSignedClinicLogoUrl,
  resolveClinicLogoUrl,
} from "@/lib/clinic-logo";

export const LOGO_MAX = 5 * 1024 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];

export async function signedLogoUrl(path: string | null | undefined): Promise<string | null> {
  return resolveClinicLogoUrl(path);
}

/**
 * Upload de logo no bucket `clinic-logos`.
 * Caminho determinístico: `{clinic_id}/logo.{ext}`.
 * Preview instantâneo, drag-and-drop, validação de tipo e tamanho (≤ 5 MB).
 */
export function LogoUploader({
  clinicId,
  value,
  onChange,
}: {
  clinicId: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewBroken, setPreviewBroken] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const { data: previewUrl } = useQuery({
    queryKey: ["logo-preview", clinicId, value],
    queryFn: () => signedLogoUrl(value),
    enabled: !!value && !localPreviewUrl,
  });
  const visiblePreviewUrl = localPreviewUrl ?? previewUrl;
  useEffect(() => {
    setPreviewBroken(false);
    setLocalPreviewUrl(null);
  }, [clinicId, value]);

  const handleFile = async (file: File) => {
    if (!LOGO_TYPES.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou SVG.");
      return;
    }
    if (file.size > LOGO_MAX) {
      toast.error("Arquivo maior que 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${clinicId}/logo-${Date.now()}.${ext}`;
      invalidateSignedClinicLogoUrl(path);
      const objectUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(objectUrl);
      const { error } = await supabase.storage
        .from("clinic-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      onChange(path);
      toast.success("Logo enviada. Clique em Salvar para aplicar.");
    } catch (e: unknown) {
      toast.error("Falha no upload: " + errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
      }}
      className={`mt-1 border-2 border-dashed rounded-lg p-4 flex items-center gap-4 transition-colors ${
        dragOver ? "border-primary bg-primary/5" : "border-muted"
      }`}
    >
      <div className="w-24 h-24 rounded border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
        {visiblePreviewUrl && !previewBroken ? (
          <img
            src={visiblePreviewUrl}
            alt="Logo"
            className="max-w-full max-h-full object-contain"
            onError={() => setPreviewBroken(true)}
          />
        ) : (
          <span className="text-xs text-muted-foreground">Sem logo</span>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-xs text-muted-foreground">
          Arraste um arquivo ou selecione. JPG, PNG ou SVG. Máximo 5 MB.
        </p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.svg,image/jpeg,image/png,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <Upload className="h-4 w-4 mr-1" /> {busy ? "Enviando..." : "Selecionar arquivo"}
          </Button>
          {value && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChange(null)}
              disabled={busy}
            >
              <X className="h-4 w-4 mr-1" /> Remover
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Erro inesperado.";
}
