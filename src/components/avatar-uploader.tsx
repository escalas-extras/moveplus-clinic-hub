import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { AVATAR_BUCKET, AVATAR_MAX, AVATAR_TYPES, signedAvatarUrl } from "@/lib/user-avatar";

/**
 * Upload de avatar do usuário no bucket `user-avatars`.
 * Caminho determinístico: `{user_id}/avatar.{ext}`.
 * Persiste `profiles.avatar_url` com o path.
 */
export function AvatarUploader({
  userId,
  initial,
}: {
  userId: string;
  initial: string | null;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState<string | null>(initial);
  const [busy, setBusy] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => setPath(initial), [initial]);
  useEffect(() => setBroken(false), [path]);

  const { data: previewUrl } = useQuery({
    queryKey: ["avatar-preview", userId, path],
    queryFn: () => signedAvatarUrl(path),
    enabled: !!path,
    staleTime: 50 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  async function persist(newPath: string | null) {
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: newPath })
      .eq("id", userId);
    if (error) throw error;
    setPath(newPath);
    qc.invalidateQueries({ queryKey: ["user-avatar", userId] });
    qc.invalidateQueries({ queryKey: ["avatar-preview", userId] });
  }

  async function handleFile(file: File) {
    if (!AVATAR_TYPES.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > AVATAR_MAX) {
      toast.error("Arquivo maior que 2 MB.");
      return;
    }
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const newPath = `${userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(newPath, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      await persist(newPath);
      toast.success("Foto de perfil atualizada.");
    } catch (e: any) {
      toast.error("Falha no upload: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      if (path && !/^https?:\/\//i.test(path)) {
        await supabase.storage.from(AVATAR_BUCKET).remove([path]);
      }
      await persist(null);
      toast.success("Foto removida.");
    } catch (e: any) {
      toast.error("Falha ao remover: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-full border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
        {previewUrl && !broken ? (
          <img
            src={previewUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <UserIcon className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-xs text-muted-foreground">JPG, PNG ou WebP. Máximo 2 MB.</p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Upload className="h-4 w-4 mr-1" /> {busy ? "Enviando…" : "Selecionar foto"}
          </Button>
          {path && (
            <Button type="button" size="sm" variant="ghost" onClick={handleRemove} disabled={busy}>
              <X className="h-4 w-4 mr-1" /> Remover
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Reusable circle avatar that resolves a profile avatar via signed URL. */
export function UserAvatar({
  userId,
  avatarPath,
  name,
  size = 36,
  gradient,
  className,
}: {
  userId: string | null | undefined;
  avatarPath: string | null | undefined;
  name: string;
  size?: number;
  gradient?: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const { data: url, isLoading } = useQuery({
    queryKey: ["avatar-preview", userId, avatarPath],
    queryFn: () => signedAvatarUrl(avatarPath ?? null),
    enabled: !!avatarPath,
    staleTime: 50 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  useEffect(() => setBroken(false), [avatarPath]);
  const initial = (name || "U").trim().charAt(0).toUpperCase();
  const style: React.CSSProperties = {
    width: size,
    height: size,
    background: gradient,
  };
  // Enquanto a signed URL ainda está sendo gerada e existe um avatarPath,
  // mostramos um placeholder neutro (mesmo footprint) para evitar flash do
  // monograma ao trocar de rota.
  if (avatarPath && isLoading && !url) {
    return (
      <div
        className={["rounded-full bg-muted shrink-0", className || ""].join(" ")}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }
  if (url && !broken) {
    return (
      <div
        className={["rounded-full overflow-hidden shrink-0 bg-muted", className || ""].join(" ")}
        style={{ width: size, height: size }}
      >
        <img
          src={url}
          alt={name}
          className="w-full h-full object-cover"
          loading="eager"
          decoding="async"
          onError={() => setBroken(true)}
        />
      </div>
    );
  }
  return (
    <div
      className={[
        "rounded-full flex items-center justify-center text-white font-semibold shrink-0",
        className || "",
      ].join(" ")}
      style={style}
      title={name}
    >
      <span style={{ fontSize: Math.round(size * 0.4) }}>{initial}</span>
    </div>
  );
}
