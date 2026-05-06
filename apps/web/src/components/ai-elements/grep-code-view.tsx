"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { codeToHtml } from "shiki/bundle/web";
import { cn } from "~/lib/utils";

type GrepCodeViewProps = {
  code: string;
  matchCount?: number;
  className?: string;
};

export function GrepCodeView({
  code,
  matchCount,
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
    <div className={cn("mt-1 flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1.5 font-mono text-label-2xs text-muted-foreground">
        <span>
          {matchCount != null
            ? `${matchCount} ${matchCount === 1 ? "match" : "matches"}`
            : "grep results"}
        </span>
      </div>
      <div className="overflow-hidden rounded-md border border-border">
        {html ? (
          <div
            className={baseClass}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className={cn(baseClass, "whitespace-pre text-muted-foreground p-2")}>
            {code}
          </pre>
        )}
      </div>
    </div>
  );
}

export { parseGrepResult } from "./code-view";
