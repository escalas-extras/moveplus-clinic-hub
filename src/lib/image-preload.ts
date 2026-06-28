/** Cache em memória de imagens já carregadas na sessão (logo, avatar). */

const loadedUrls = new Set<string>();
const inflight = new Map<string, Promise<void>>();

export function isImageSessionLoaded(url: string | null | undefined): boolean {
  return !!url && loadedUrls.has(url);
}

export function markImageSessionLoaded(url: string | null | undefined) {
  if (url) loadedUrls.add(url);
}

export function preloadImageUrl(url: string | null | undefined): Promise<void> {
  if (!url || typeof window === "undefined") return Promise.resolve();
  if (loadedUrls.has(url)) return Promise.resolve();

  const pending = inflight.get(url);
  if (pending) return pending;

  const promise = new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      loadedUrls.add(url);
      inflight.delete(url);
      resolve();
    };
    img.onerror = () => {
      inflight.delete(url);
      resolve();
    };
    img.src = url;
  });

  inflight.set(url, promise);
  return promise;
}

export function preloadImageUrls(urls: Array<string | null | undefined>) {
  return Promise.all(urls.filter(Boolean).map((u) => preloadImageUrl(u)));
}
