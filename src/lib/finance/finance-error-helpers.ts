/**
 * Hotfix H1 — mensagens de erro padronizadas do Financeiro.
 */

export function financeErrorMessage(error: unknown, fallback = "Não foi possível carregar os dados financeiros."): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export function isLikelyMissingMigrationError(error: unknown): boolean {
  const msg = financeErrorMessage(error, "").toLowerCase();
  if (!msg) return false;
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    msg.includes("schema cache") ||
    msg.includes("42703") ||
    msg.includes("42p01") ||
    msg.includes("pgrst204") ||
    (msg.includes("column") && msg.includes("not found")) ||
    (msg.includes("relation") && msg.includes("not found"))
  );
}

export function financeErrorMigrationHint(error: unknown): string | null {
  if (!isLikelyMissingMigrationError(error)) return null;
  return "Verifique se as migrations do Financeiro (G1/G2) foram aplicadas no Supabase deste ambiente.";
}

export function financeErrorDetails(error: unknown, fallback?: string): { message: string; hint: string | null } {
  return {
    message: financeErrorMessage(error, fallback),
    hint: financeErrorMigrationHint(error),
  };
}
