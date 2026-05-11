"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CodeView } from "@/components/ai-elements/code-view";
import { Streamdown, defaultTranslations, type CustomRendererProps, type LinkSafetyModalProps } from "streamdown";
import { cn } from "~/lib/utils";
import { Check, Copy, Globe, X, ICON_SIZES } from "@/components/icons";

function ResponseCodeBlock({ code, language, isIncomplete }: CustomRendererProps) {
  return <CodeView code={code} language={language} isIncomplete={isIncomplete} />;
}

const CODE_BLOCK_LANGUAGES = [
  "typescript", "tsx", "ts", "javascript", "js", "jsx", "json", "jsonc",
  "markdown", "md", "mdx", "css", "scss", "html", "python", "py", "ruby", "rb",
  "go", "rust", "rs", "java", "c", "cpp", "csharp", "cs", "php", "swift",
  "kotlin", "kt", "bash", "sh", "shell", "zsh", "yaml", "yml", "toml",
  "sql", "graphql", "gql", "vue", "svelte", "prisma", "docker",
  "dockerfile", "xml", "diff", "ini", "text", "plaintext",
];

const codeRenderers = CODE_BLOCK_LANGUAGES.map((lang) => ({
  language: lang,
  component: ResponseCodeBlock,
}));

function LinkSafetyModal({ url, isOpen, onClose, onConfirm }: LinkSafetyModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [url]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm"
      data-streamdown="link-safety-modal"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="button"
      tabIndex={0}
    >
      <div
        className="relative mx-4 flex w-full max-w-md flex-col gap-4 rounded-xl border bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <button
          className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          onClick={onClose}
          title={defaultTranslations.close}
          type="button"
        >
          <X size={16} />
        </button>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <Globe size={20} />
            <span>{defaultTranslations.openExternalLink}</span>
          </div>
          <p className="text-muted-foreground text-sm">
            {defaultTranslations.externalLinkWarning}
          </p>
        </div>
        <div
          className={cn(
            "break-all rounded-md bg-muted p-3 font-mono text-sm",
            url.length > 100 && "max-h-32 overflow-y-auto",
          )}
        >
          {url}
        </div>
        <div className="flex gap-2">
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 font-medium text-sm transition-all hover:bg-muted"
            onClick={handleCopy}
            type="button"
          >
            {copied ? (
              <>
                <Check size={ICON_SIZES.sm} />
                <span>{defaultTranslations.copied}</span>
              </>
            ) : (
              <>
                <Copy size={ICON_SIZES.sm} />
                <span>{defaultTranslations.copyLink}</span>
              </>
            )}
          </button>
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-all hover:bg-primary/90"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            type="button"
          >
            <Globe size={ICON_SIZES.sm} />
            <span>{defaultTranslations.openLink}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const linkSafetyConfig = {
  enabled: true,
  renderModal: (props: LinkSafetyModalProps) => <LinkSafetyModal {...props} />,
};

export type ResponseProps = React.ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      linkSafety={linkSafetyConfig}
      plugins={{ renderers: codeRenderers }}
      className={cn(
        "streamdown-response w-full max-w-none text-paragraph-sm leading-relaxed text-foreground",
        // tighten default prose-y spacing
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "[&_p]:my-2",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-label-xs",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:my-0.5",
        "[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-label-lg [&_h1]:font-semibold",
        "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-label-md [&_h2]:font-semibold",
        "[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-label-sm [&_h3]:font-semibold",
        "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
        "[&_a]:text-foreground [&_a]:underline [&_a]:decoration-border [&_a]:underline-offset-2 hover:[&_a]:decoration-foreground",
        "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-label-xs",
        "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium",
        "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
        className,
      )}
      {...props}
    />
  ),
  (prev, next) => prev.children === next.children,
);

Response.displayName = "Response";
