import { useEffect } from "react";
import { toast } from "sonner";
import { useActiveClinic } from "@/lib/active-clinic";

const TOAST = "Modo Suporte ativo: esta ação está disponível apenas para visualização.";
const TOOLTIP = "Modo Suporte ativo. Encerre o modo suporte para realizar alterações.";

// Padrões de texto que indicam ação de escrita/edição/exclusão. Botões com esse
// rótulo são automaticamente marcados como bloqueados em Modo Suporte.
const WRITE_TEXT_PATTERNS = [
  /\bnov[oa]\b/i,
  /\bcriar\b/i,
  /\bsalvar\b/i,
  /\beditar\b/i,
  /\bexcluir\b/i,
  /\bremover\b/i,
  /\bapagar\b/i,
  /\binativar\b/i,
  /\barquivar\b/i,
  /\bcancelar\b/i,
  /\bemitir\b/i,
  /\bemiss[aã]o\b/i,
  /\benviar\b/i,
  /\bassinar\b/i,
  /\bfinalizar\b/i,
  /\bduplicar\b/i,
  /\baprovar\b/i,
  /\bconvidar\b/i,
  /\bdefinir padr[ãa]o\b/i,
  /\bdefinir como\b/i,
  /\badicionar\b/i,
  /\bupload\b/i,
  /\bpago\b/i,
  /\brecibo\b/i,
  /\bmarcar como\b/i,
];

// Botões com esses textos NUNCA devem ser bloqueados (são navegação/leitura).
const SAFE_TEXT_PATTERNS = [
  /\bvisualizar\b/i,
  /\bver\b/i,
  /\bbaixar\b/i,
  /\bimprimir\b/i,
  /\bexportar\b/i,
  /\bfechar\b/i,
  /\bvoltar\b/i,
  /\bencerrar\b/i,
  /\bsair\b/i,
  /\bbuscar\b/i,
  /\bfiltrar\b/i,
  /\bhoje\b/i,
  /\bpr[óo]ximo\b/i,
  /\banterior\b/i,
  /\babrir\b/i,
];

function shouldBlock(el: HTMLElement): boolean {
  // Whitelist explícita
  if (el.dataset.supportAllow === "true") return false;
  // Já tratado pelo SupportGuardButton — ignora
  if (el.closest("[data-support-blocked='handled']")) return false;
  // Botões de navegação dentro do sidebar nunca bloqueiam
  if (el.closest("[data-sidebar='nav-item']")) return false;
  if (el.closest("aside")) return false;

  const txt = (el.innerText || el.textContent || "").trim();
  if (!txt) return false;
  if (SAFE_TEXT_PATTERNS.some((re) => re.test(txt))) return false;
  if (WRITE_TEXT_PATTERNS.some((re) => re.test(txt))) return true;

  // Submit buttons em forms são quase sempre escrita.
  if (el instanceof HTMLButtonElement && el.type === "submit") return true;
  return false;
}

/**
 * Listener global que, em Modo Suporte, intercepta cliques em botões de
 * escrita e exibe toast. Aplica também `cursor-not-allowed` visual via title.
 * NÃO altera funcionalidades fora do Modo Suporte.
 */
export function SupportClickInterceptor() {
  const { supportMode } = useActiveClinic();

  useEffect(() => {
    if (!supportMode) return;

    function annotate() {
      const buttons = document.querySelectorAll<HTMLElement>(
        "button:not([data-support-checked])",
      );
      buttons.forEach((b) => {
        b.setAttribute("data-support-checked", "1");
        if (shouldBlock(b)) {
          b.setAttribute("data-support-blocked-auto", "1");
          b.title = TOOLTIP;
          b.style.cursor = "not-allowed";
          b.style.opacity = "0.6";
        }
      });
    }

    annotate();
    const obs = new MutationObserver(() => annotate());
    obs.observe(document.body, { childList: true, subtree: true });

    function onClickCapture(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const btn = target.closest("button") as HTMLElement | null;
      if (!btn) return;
      if (btn.getAttribute("data-support-blocked-auto") === "1") {
        e.preventDefault();
        e.stopPropagation();
        toast.error(TOAST);
      }
    }
    document.addEventListener("click", onClickCapture, true);

    return () => {
      document.removeEventListener("click", onClickCapture, true);
      obs.disconnect();
      // Limpa marcações ao sair do Modo Suporte
      document
        .querySelectorAll<HTMLElement>("[data-support-checked]")
        .forEach((b) => {
          b.removeAttribute("data-support-checked");
          if (b.getAttribute("data-support-blocked-auto") === "1") {
            b.removeAttribute("data-support-blocked-auto");
            b.removeAttribute("title");
            b.style.cursor = "";
            b.style.opacity = "";
          }
        });
    };
  }, [supportMode]);

  return null;
}
