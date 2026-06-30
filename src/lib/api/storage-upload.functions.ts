import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STORAGE_BUCKETS = {
  "clinic-logos": {
    public: false,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"],
  },
  "user-avatars": {
    public: false,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
  },
} as const;

const storageBucketSchema = z.enum(["clinic-logos", "user-avatars"]);

async function ensureStorageBucket(supabaseAdmin: any, bucket: keyof typeof STORAGE_BUCKETS) {
  const config = STORAGE_BUCKETS[bucket];
  const { data: existing, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) throw new Error(listError.message);

  if ((existing ?? []).some((row: { id?: string; name?: string }) => row.id === bucket || row.name === bucket)) {
    return;
  }

  const { error } = await supabaseAdmin.storage.createBucket(bucket, {
    public: config.public,
    fileSizeLimit: config.fileSizeLimit,
    allowedMimeTypes: config.allowedMimeTypes,
  });
  if (error && !String(error.message).toLowerCase().includes("already exists")) {
    throw new Error(error.message);
  }
}

export const createSignedStorageUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        bucket: storageBucketSchema,
        path: z.string().min(3),
        contentType: z.string().min(3),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await ensureStorageBucket(supabaseAdmin, data.bucket);

    const { data: signed, error } = await supabaseAdmin.storage
      .from(data.bucket)
      .createSignedUploadUrl(data.path);
    if (error) throw new Error(error.message);

    return {
      bucket: data.bucket,
      path: signed.path ?? data.path,
      signedUrl: signed.signedUrl,
      token: signed.token,
    };
  });

export const removeStorageObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        bucket: storageBucketSchema,
        path: z.string().min(3),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await ensureStorageBucket(supabaseAdmin, data.bucket);
    const { error } = await supabaseAdmin.storage.from(data.bucket).remove([data.path]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
