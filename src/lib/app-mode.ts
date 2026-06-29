export type AppMode = "clinic" | "admin";

const ADMIN_HOST_MARKER = "fisioos-admin";

export function getAppMode(): AppMode {
  const envMode = ((import.meta as any).env?.VITE_APP_MODE ?? "").toLowerCase();
  if (envMode === "admin") return "admin";

  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host === ADMIN_HOST_MARKER || host.startsWith(`${ADMIN_HOST_MARKER}.`)) {
      return "admin";
    }
  }

  return "clinic";
}

export function isAdminAppMode() {
  return getAppMode() === "admin";
}
