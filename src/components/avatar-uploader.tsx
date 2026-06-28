import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AVATAR_BUCKET,
  AVATAR_MAX,
  AVATAR_TYPES,
  getCachedAvatarUrl,
  invalidateSignedAvatarUrl,
  preloadAvatarUrl,
  signedAvatarUrl,
} from "@/lib/user-avatar";
import { pcSet } from "@/lib/persistent-cache";
import { isImageSessionLoaded, markImageSessionLoaded } from "@/lib/image-preload";
import { cn } from "@/lib/utils";

/**
 * Upload de avatar do usuário no bucket `user-avatars`.
 * Caminho determinístico: `{user_id}/avatar.{ext}`.
 * Persiste `profiles.avatar_url` com o path.
 */
export function AvatarUploader({
  userId,
  initial,
  initialLoading = false,
}: {
  userId: string;
  initial: string | null;
  initialLoading?: boolean;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState<string | null>(initial);
  const [busy, setBusy] = useState(false);
  const [broken, setBroken] = useState(false);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  useEffect(() => setPath(initial), [initial]);
  useEffect(() => setBroken(false), [path]);

  const { data: previewUrl, isLoading: previewLoading } = useQuery({
    queryKey: ["avatar-preview", userId, path],
    queryFn: () => signedAvatarUrl(path),
    enabled: !!path,
    staleTime: 50 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    initialData: getCachedAvatarUrl(path) ?? undefined,
  });

  useEffect(() => {
    if (localPreviewUrl) setDisplayUrl(localPreviewUrl);
    else if (previewUrl) setDisplayUrl(previewUrl);
    if (!path) setDisplayUrl(null);
  }, [localPreviewUrl, path, previewUrl]);

  async function persist(newPath: string | null) {
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: newPath })
      .eq("id", userId);
    if (error) throw error;
    invalidateSignedAvatarUrl(newPath);
    setPath(newPath);
    pcSet(`fos:profile-avatar:${userId}`, { avatar_url: newPath }, 24 * 60 * 60_000);
    qc.setQueryData(["user-avatar", userId], { avatar_url: newPath });
    await qc.invalidateQueries({ queryKey: ["user-avatar", userId] });
    await qc.invalidateQueries({ queryKey: ["my-profile", userId] });
    await qc.invalidateQueries({ queryKey: ["avatar-preview", userId] });
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
      const previousPath = path;
      const newPath = `${userId}/avatar-${Date.now()}.${ext}`;
      invalidateSignedAvatarUrl(newPath);
      const objectUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(objectUrl);
      const { error: upErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(newPath, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      await persist(newPath);
      if (previousPath && previousPath !== newPath && !/^https?:\/\//i.test(previousPath)) {
        await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
      }
      toast.success("Foto de perfil atualizada.");
    } catch (e: unknown) {
      toast.error("Falha no upload: " + errorMessage(e));
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
      setLocalPreviewUrl(null);
      await persist(null);
      toast.success("Foto removida.");
    } catch (e: unknown) {
      toast.error("Falha ao remover: " + errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-full border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
        {displayUrl && !broken ? (
          <img
            src={displayUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (path && previewLoading) || initialLoading ? (
          <div className="h-full w-full bg-muted" aria-hidden="true" />
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
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
  isLoading: profileLoading = false,
}: {
  userId: string | null | undefined;
  avatarPath: string | null | undefined;
  name: string;
  size?: number;
  gradient?: string;
  className?: string;
  isLoading?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const [displayUrl, setDisplayUrl] = useState<string | null>(() =>
    getCachedAvatarUrl(avatarPath),
  );
  const [imgVisible, setImgVisible] = useState(() =>
    isImageSessionLoaded(getCachedAvatarUrl(avatarPath)),
  );
  const { data: url, isLoading } = useQuery({
    queryKey: ["avatar-preview", userId, avatarPath],
    queryFn: () => signedAvatarUrl(avatarPath ?? null),
    enabled: !!avatarPath,
    staleTime: 50 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    initialData: getCachedAvatarUrl(avatarPath) ?? undefined,
  });
  useEffect(() => setBroken(false), [avatarPath]);
  useEffect(() => {
    if (url) {
      setDisplayUrl(url);
      void preloadAvatarUrl(avatarPath);
    }
    if (!avatarPath) setDisplayUrl(null);
  }, [avatarPath, url]);
  const initial = (name || "U").trim().charAt(0).toUpperCase();
  const style: React.CSSProperties = {
    width: size,
    height: size,
    background: gradient,
  };
  // Enquanto a signed URL ainda está sendo gerada e existe um avatarPath,
  // mostramos um placeholder neutro (mesmo footprint) para evitar flash do
  // monograma ao trocar de rota.
  if (((avatarPath && isLoading) || profileLoading) && !displayUrl) {
    return (
      <div
        className={["rounded-full bg-muted/80 shrink-0", className || ""].join(" ")}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }
  if (displayUrl && !broken) {
    return (
      <div
        className={["rounded-full overflow-hidden shrink-0 bg-muted", className || ""].join(" ")}
        style={{ width: size, height: size }}
      >
        <img
          src={displayUrl}
          alt={name}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-150",
            imgVisible ? "opacity-100" : "opacity-0",
          )}
          loading="eager"
          decoding="async"
          onError={() => setBroken(true)}
          onLoad={() => {
            markImageSessionLoaded(displayUrl);
            setImgVisible(true);
          }}
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

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Erro inesperado.";
}
