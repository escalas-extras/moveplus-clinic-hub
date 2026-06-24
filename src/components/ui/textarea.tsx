import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, onInput, onChange, ...props }, ref) => {
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
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, []);

    // Resize on every render (covers controlled value updates, RHF resets, etc.)
    React.useLayoutEffect(() => {
      resize();
    });

    // Resize when the element changes size (e.g. becomes visible inside a tab/dialog,
    // viewport resizes, fonts load).
    React.useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      // Initial pass after mount in case layout wasn't ready yet.
      const raf = requestAnimationFrame(resize);

      let ro: ResizeObserver | undefined;
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => resize());
        if (el.parentElement) ro.observe(el.parentElement);
      }

      // Catch programmatic value changes that don't go through React (rare, but RHF
      // sometimes sets the input value via the ref).
      const mo = new MutationObserver(() => resize());
      mo.observe(el, { attributes: true, attributeFilter: ["value"] });

      window.addEventListener("resize", resize);
      return () => {
        cancelAnimationFrame(raf);
        ro?.disconnect();
        mo.disconnect();
        window.removeEventListener("resize", resize);
      };
    }, [resize]);

    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "resize-none overflow-hidden",
          className,
        )}
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
