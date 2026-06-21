import { toast } from "sonner";
import { useActiveClinic } from "@/lib/active-clinic";

export const SUPPORT_TOAST = "Modo Suporte ativo: esta ação está disponível apenas para visualização.";
export const SUPPORT_TOOLTIP = "Modo Suporte ativo. Encerre o modo suporte para realizar alterações.";

/**
 * Hook que devolve utilidades para bloquear ações de escrita em Modo Suporte
 * mantendo feedback amigável ao usuário (toast + cursor + tooltip).
 *
 * Uso típico:
 *   const { supportMode, guard, blockedProps } = useSupportGuard();
 *   <Button {...blockedProps} onClick={guard(() => action())}>Salvar</Button>
 *
 * - `guard(fn)` retorna um handler que, em Modo Suporte, exibe o toast e NÃO
 *   chama `fn`. Fora do Modo Suporte, executa `fn` normalmente.
 * - `blockedProps` aplica `aria-disabled`, `title` e `className` com
 *   `cursor-not-allowed`+opacidade quando em Modo Suporte. NUNCA seta
 *   `disabled` para preservar o clique e disparar o toast.
 */
export function useSupportGuard() {
  const { supportMode } = useActiveClinic();

  function guard<T extends any[]>(fn: (...args: T) => void) {
    return (...args: T) => {
      if (supportMode) {
        toast.error(SUPPORT_TOAST);
        return;
      }
      fn(...args);
    };
  }

  const blockedProps = supportMode
    ? {
        "aria-disabled": true as const,
        title: SUPPORT_TOOLTIP,
        "data-support-blocked": "true",
        className: "cursor-not-allowed opacity-60",
      }
    : {};

  return { supportMode, guard, blockedProps };
}
