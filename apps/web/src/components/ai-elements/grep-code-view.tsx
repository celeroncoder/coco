"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { codeToHtml } from "shiki/bundle/web";
import { cn } from "~/lib/utils";
import { Search } from "@/components/icons";

type GrepCodeViewProps = {
  code: string;
  matchCount?: number;
  pattern?: string;
  path?: string;
  className?: string;
};

export function GrepCodeView({
  code,
  matchCount,
  pattern,
  path,
  className,
}: GrepCodeViewProps) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "github-dark" : "github-light";
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    codeToHtml(code, {
      lang: "text",
      theme,
    })
      .then((res) => {
        if (!cancelled) setHtml(res);
      })
      .catch(() => {
        if (!cancelled) setHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [code, theme]);

  const baseClass = cn(
    "max-h-80 overflow-auto font-mono text-[11px] leading-[1.5]",
    "[&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0 [&_pre]:whitespace-pre",
    "[&_code]:!bg-transparent",
  );

  return (
    <div className={cn("flex w-full max-w-full flex-col gap-1.5", className)}>
      <div className="overflow-hidden rounded-md border border-border bg-muted/40">
        <div className="flex items-baseline gap-2 border-b border-border px-3 py-2 font-mono text-label-2xs leading-5">
          <span aria-hidden className="select-none shrink-0 text-muted-foreground">
            <Search size={12} />
          </span>
          <code className="flex-1 whitespace-pre-wrap break-all text-foreground">
            {pattern ?? "grep"}
          </code>
          <span className="shrink-0 text-muted-foreground/50">
            {matchCount != null
              ? `${matchCount} ${matchCount === 1 ? "match" : "matches"}`
              : ""}
          </span>
        </div>
        {code && (
          <div className="overflow-hidden">
            {html ? (
              <div
                className={cn(
                  baseClass,
                  "px-3 py-2",
                )}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <pre
                className={cn(
                  baseClass,
                  "px-3 py-2 whitespace-pre-wrap break-all text-muted-foreground",
                )}
              >
                {code}
              </pre>
            )}
          </div>
        )}
      </div>
      {path && (
        <span className="px-1 font-mono text-label-2xs text-muted-foreground/70">
          in {path}
        </span>
      )}
    </div>
  );
}

export { parseGrepResult } from "./code-view";
