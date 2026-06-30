import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Image, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { createSignedStorageUpload } from "@/lib/api/storage-upload.functions";
import { invalidateSignedClinicLogoUrl, resolveClinicLogoUrl } from "@/lib/clinic-logo";
import { cn } from "@/lib/utils";
import { clinical } from "@/components/layout/clinical-classes";
import { LogoBox } from "@/components/logo-box";

export const LOGO_MAX = 5 * 1024 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
const LOGO_BUCKET = "clinic-logos";

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
  const createSignedUpload = useServerFn(createSignedStorageUpload);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const { data: previewUrl } = useQuery({
    queryKey: ["logo-preview", clinicId, value],
    queryFn: () => signedLogoUrl(value),
    enabled: !!value && !localPreviewUrl,
  });
  const visiblePreviewUrl = localPreviewUrl ?? previewUrl;
  useEffect(() => {
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
      const safeName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9.\-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const path = `${clinicId}/branding/logo-${Date.now()}-${safeName}`;
      invalidateSignedClinicLogoUrl(path);
      const objectUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(objectUrl);
      const signed = await createSignedUpload({
        data: { bucket: LOGO_BUCKET, path, contentType: file.type },
      });
      const { error } = await supabase.storage
        .from(LOGO_BUCKET)
        .uploadToSignedUrl(signed.path, signed.token, file);
      if (error) throw error;
      onChange(signed.path);
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
      className={cn(
        clinical.uploadZone,
        "mt-1 grid gap-4 p-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center",
        dragOver && "border-primary/45 bg-primary/5 shadow-[0_10px_28px_-18px_rgba(15,76,92,0.35)]",
      )}
    >
      <div className="mx-auto rounded-2xl bg-white p-2 shadow-soft ring-1 ring-black/5 sm:mx-0">
        <LogoBox
          src={visiblePreviewUrl}
          alt="Logo"
          variant="document"
          rounded="lg"
          framed={false}
          fallback={
            <span className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-xs text-muted-foreground">
              <Image className="h-5 w-5" aria-hidden />
              Sem logo
            </span>
          }
        />
      </div>
      <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {value ? "Logo pronta para uso" : "Arraste a logo da clínica aqui"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Use JPG, PNG ou SVG com até 5 MB. O preview é atualizado antes de salvar.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
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
            <Upload className="h-4 w-4 mr-1" /> {busy ? "Enviando..." : value ? "Substituir logo" : "Selecionar arquivo"}
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
