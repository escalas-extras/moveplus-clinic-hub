import * as React from "react";

import { cn } from "@/lib/utils";
import { clinical } from "@/components/layout/clinical-classes";

export type TextareaProps = React.ComponentProps<"textarea"> & {
  /** Crescimento automático de altura (desativado por padrão — preferir resize-y). */
  autoGrow?: boolean;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoGrow = false, onInput, onChange, style, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      },
      [ref],
    );

    const resize = React.useCallback(() => {
      const el = innerRef.current;
      if (!el || !autoGrow) return;
      el.style.width = "100%";
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, [autoGrow]);

    React.useLayoutEffect(() => {
      if (autoGrow) resize();
    });

    React.useEffect(() => {
      if (!autoGrow) return;
      const el = innerRef.current;
      if (!el) return;
      const raf = requestAnimationFrame(resize);

      let ro: ResizeObserver | undefined;
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => resize());
        if (el.parentElement) ro.observe(el.parentElement);
      }

      window.addEventListener("resize", resize);
      return () => {
        cancelAnimationFrame(raf);
        ro?.disconnect();
        window.removeEventListener("resize", resize);
      };
    }, [autoGrow, resize]);

    return (
      <textarea
        className={cn(
          clinical.textarea,
          autoGrow && "overflow-hidden resize-none",
          className,
        )}
        style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", ...style }}
        ref={setRefs}
        onInput={(e) => {
          resize();
          onInput?.(e);
        }}
        onChange={(e) => {
          resize();
          onChange?.(e);
        }}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
