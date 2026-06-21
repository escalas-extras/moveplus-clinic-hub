import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, Info } from "lucide-react";

export function LibraryContentView({ body }: { body: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2 prose-h3:text-base prose-h3:mt-4 prose-h3:mb-1 prose-p:leading-relaxed prose-ul:my-2 prose-li:my-0.5 prose-strong:text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          blockquote({ children }) {
            const text = String(children).toLowerCase();
            const isAlert = text.includes("atenção") || text.includes("alerta") || text.includes("emergência") || text.includes("procure");
            const Icon = isAlert ? AlertTriangle : Info;
            const cls = isAlert
              ? "border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200"
              : "border-l-4 border-sky-500 bg-sky-50 dark:bg-sky-950/30 text-sky-900 dark:text-sky-200";
            return (
              <div className={`my-3 rounded-r-md px-3 py-2 flex gap-2 items-start text-sm not-prose ${cls}`}>
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="[&>p]:my-0">{children}</div>
              </div>
            );
          },
          hr: () => <hr className="my-4 border-border" />,
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
